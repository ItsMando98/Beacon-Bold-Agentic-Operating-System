import importlib.util
import io
import json
import pathlib
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('receiver', 'infra/vps/receiver.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)
RELEASE = 'a' * 40

class ReceiverTest(unittest.TestCase):
    def archive(self, directory, foreign=False, revision=RELEASE):
        path = pathlib.Path(directory) / 'images.tar.gz'
        manifest = []
        with tarfile.open(path, 'w:gz') as output:
            def add(name, value):
                body = json.dumps(value).encode()
                item = tarfile.TarInfo(name)
                item.size = len(body)
                output.addfile(item, io.BytesIO(body))
            for service in receiver.SERVICES:
                name = service + '.json'
                add(name, {'architecture': 'amd64', 'os': 'linux', 'config': {'Labels': {'org.opencontainers.image.revision': revision}}})
                manifest.append({'Config': name, 'RepoTags': [f'foreign:{RELEASE}' if foreign and service == 'api' else f'beacon-bold-{service}:{RELEASE}']})
            add('manifest.json', manifest)
        return path

    def test_accepts_only_fixed_names_and_revision(self):
        with tempfile.TemporaryDirectory() as directory:
            receiver.validate_archive(self.archive(directory), RELEASE)
            with self.assertRaises(RuntimeError):
                receiver.validate_archive(self.archive(directory, foreign=True), RELEASE)
            with self.assertRaises(RuntimeError):
                receiver.validate_archive(self.archive(directory, revision='b' * 40), RELEASE)

    def test_refuses_arbitrary_ssh_commands(self):
        with patch.dict(receiver.os.environ, {'SSH_ORIGINAL_COMMAND': 'deploy ' + RELEASE + '; id'}), patch.object(receiver, 'run') as execute:
            with self.assertRaises(RuntimeError):
                receiver.main()
            execute.assert_not_called()

    def test_failed_migration_never_updates_apps(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(receiver, 'ROOT', pathlib.Path(directory)), patch.object(receiver, 'validate_archive'), patch.object(receiver, 'run'), patch.object(receiver, 'encrypted_backup'), patch.object(receiver, 'compose') as compose:
            compose.side_effect = [None, RuntimeError('migration failed')]
            with self.assertRaises(RuntimeError):
                receiver.deploy('images', RELEASE, verify_main=False)
            self.assertEqual(compose.call_count, 2)
            self.assertEqual(compose.call_args.args[1:4], ('run', '--rm', '--no-deps'))

    def test_https_failure_restores_previous_apps(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(receiver, 'ROOT', pathlib.Path(directory)), patch.object(receiver, 'validate_archive'), patch.object(receiver, 'run'), patch.object(receiver, 'encrypted_backup'), patch.object(receiver, 'compose') as compose, patch.object(receiver, 'accept_https', side_effect=RuntimeError('HTTPS failed')), patch.object(receiver.time, 'sleep'):
            (pathlib.Path(directory) / 'current.json').write_text(json.dumps({'release': 'b' * 40}))
            with self.assertRaises(RuntimeError):
                receiver.deploy('images', RELEASE, verify_main=False)
            self.assertEqual(compose.call_args.args[0], 'b' * 40)
            self.assertEqual(compose.call_args.args[-4:], ('api', 'app', 'web', 'agency'))

if __name__ == '__main__':
    unittest.main()
