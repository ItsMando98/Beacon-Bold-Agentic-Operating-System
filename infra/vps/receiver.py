#!/usr/bin/env python3
"""Restricted SSH endpoint: fixed staging images, configuration and volumes only."""
import json
import os
import pathlib
import re
import subprocess
import sys
import tarfile
import time
import urllib.request

ROOT = pathlib.Path('/opt/beacon-bold-staging')
SERVICES = ('api', 'app', 'web', 'migrate')
REPO = 'ItsMando98/Beacon-Bold-Agentic-Operating-System'

def run(args, env=None, capture=True):
    result = subprocess.run(args, env=env, stdout=subprocess.PIPE if capture else None,
                            stderr=subprocess.PIPE, timeout=600)
    if result.returncode:
        raise RuntimeError('Staging operation failed: ' + args[0])
    return result.stdout

def environment(release):
    config = json.loads((ROOT / 'settings.json').read_text())
    return {**os.environ, 'BEACON_RELEASE': release, 'BEACON_SECRETS_DIR': str(ROOT / 'secrets'),
            'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': config['publishable_key']}

def compose(release, *args):
    return run(['docker', 'compose', '-p', 'beacon-bold-staging', '-f', str(ROOT / 'compose.yaml'), *args], environment(release))

def validate_archive(archive, release):
    expected = {f'beacon-bold-{service}:{release}' for service in SERVICES}
    with tarfile.open(archive, 'r:gz') as bundle:
        members = bundle.getmembers()
        if sum(item.size for item in members) > 2 * 1024 * 1024 * 1024:
            raise RuntimeError('Expanded bundle exceeds limit')
        if any(pathlib.PurePosixPath(item.name).is_absolute() or '..' in pathlib.PurePosixPath(item.name).parts or item.issym() or item.islnk() for item in members):
            raise RuntimeError('Unsafe archive path')
        member = bundle.getmember('manifest.json')
        if member.size > 65536:
            raise RuntimeError('Manifest too large')
        manifest = json.load(bundle.extractfile(member))
        tags = []
        for entry in manifest:
            tags.extend(entry.get('RepoTags') or [])
            config_member = bundle.getmember(entry['Config'])
            if config_member.size > 1024 * 1024:
                raise RuntimeError('Image config too large')
            config = json.load(bundle.extractfile(config_member))
            if config.get('architecture') != 'amd64' or config.get('os') != 'linux':
                raise RuntimeError('Unexpected image platform')
            if config.get('config', {}).get('Labels', {}).get('org.opencontainers.image.revision') != release:
                raise RuntimeError('Image revision mismatch')
        if len(manifest) != 4 or len(tags) != 4 or set(tags) != expected:
            raise RuntimeError('Only fixed staging image names are accepted')

def accept_https():
    for address in ['https://staging.beaconandbold.com/health', 'https://app.staging.beaconandbold.com/', 'https://web.staging.beaconandbold.com/']:
        with urllib.request.urlopen(address, timeout=20) as response:
            if response.status != 200 or response.geturl().split('/')[2] != address.split('/')[2]:
                raise RuntimeError('HTTPS acceptance failed')
            if address.endswith('/health') and json.load(response) != {'status': 'ok', 'service': 'api'}:
                raise RuntimeError('API contract failed')

def encrypted_backup(release):
    # The dump exists only in the child-process pipe before encryption.
    destination = ROOT / 'backups'
    destination.mkdir(mode=0o700, exist_ok=True)
    output = destination / ('beacon-' + time.strftime('%Y%m%d-%H%M%S', time.gmtime()) + '.cms')
    with output.open('xb') as sink:
        dump = subprocess.Popen(['docker', 'compose', '-p', 'beacon-bold-staging', '-f', str(ROOT / 'compose.yaml'),
            'exec', '-T', 'postgres', 'sh', '-c',
            'PGPASSWORD=$(cat /run/secrets/owner_password) pg_dump -U beacon_owner -d beacon -Fc'],
            env=environment(release), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        encrypt = subprocess.Popen(['openssl', 'cms', '-encrypt', '-binary', '-aes256', '-outform', 'DER',
            str(ROOT / 'backup-public.pem')], stdin=dump.stdout, stdout=sink, stderr=subprocess.PIPE)
        dump.stdout.close()
        encrypt.communicate(timeout=120)
        dump.communicate(timeout=120)
        if dump.returncode or encrypt.returncode:
            output.unlink(missing_ok=True)
            raise RuntimeError('Backup failed')
    if output.stat().st_size > 64 * 1024 * 1024:
        raise RuntimeError('Backup exceeds approved artifact allowance')
    return output

def deploy(archive, release, verify_main=True):
    if not re.fullmatch('[a-f0-9]{40}', release):
        raise RuntimeError('Invalid release')
    if verify_main:
        request = urllib.request.Request(f'https://api.github.com/repos/{REPO}/commits/main', headers={'User-Agent': 'beacon-bold-staging'})
        with urllib.request.urlopen(request, timeout=20) as response:
            if json.load(response)['sha'] != release:
                raise RuntimeError('Only current main is deployable')
    validate_archive(archive, release)
    run(['docker', 'load', '-i', str(archive)])
    previous = json.loads((ROOT / 'current.json').read_text()) if (ROOT / 'current.json').exists() else None
    compose(release, 'up', '-d', '--wait', '--wait-timeout', '180', 'postgres', 'redis')
    encrypted_backup(release)
    compose(release, 'run', '--rm', '--no-deps', 'migrate')
    compose(release, 'run', '--rm', '--no-deps', 'acceptance')
    try:
        compose(release, 'up', '-d', '--wait', '--wait-timeout', '180', 'api', 'app', 'web')
        # Traefik requests a new certificate asynchronously; never accept invalid TLS.
        for attempt in range(18):
            try:
                accept_https()
                break
            except Exception:
                if attempt == 17:
                    raise
                time.sleep(10)
        (ROOT / 'current.json').write_text(json.dumps({'release': release, 'https': True}))
    except Exception:
        if previous:
            compose(previous['release'], 'up', '-d', '--wait', '--wait-timeout', '180', 'api', 'app', 'web')
        else:
            compose(release, 'stop', 'api', 'app', 'web')
        raise RuntimeError('Deployment failed; previous application state restored')

def main():
    os.umask(0o077)
    command = os.environ.get('SSH_ORIGINAL_COMMAND', '')
    if command == 'backup':
        release = json.loads((ROOT / 'current.json').read_text())['release']
        with encrypted_backup(release).open('rb') as source:
            while chunk := source.read(65536):
                sys.stdout.buffer.write(chunk)
        return
    match = re.fullmatch(r'deploy ([a-f0-9]{40})', command)
    if not match:
        raise RuntimeError('Command refused')
    incoming = ROOT / 'incoming.tar.gz'
    try:
        size = 0
        with incoming.open('wb') as output:
            while chunk := sys.stdin.buffer.read(65536):
                size += len(chunk)
                if size > 1024 * 1024 * 1024:
                    raise RuntimeError('Image bundle exceeds limit')
                output.write(chunk)
        deploy(incoming, match.group(1))
        print('STAGING_DEPLOYMENT_ACCEPTED ' + match.group(1))
    finally:
        incoming.unlink(missing_ok=True)

if __name__ == '__main__':
    try:
        # Serializes deployment and backup without affecting any other stack.
        import fcntl
        with (ROOT / 'deployment.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            main()
    except Exception as error:
        print('STAGING_OPERATION_FAILED: ' + type(error).__name__, file=sys.stderr)
        sys.exit(1)
