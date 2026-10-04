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

    def deploy_until_https_fails(self, directory, compose, agency_image=False):
        (pathlib.Path(directory) / 'current.json').write_text(json.dumps({'release': 'b' * 40}))
        with patch.object(receiver, 'image_exists', return_value=agency_image, create=True):
            with self.assertRaises(RuntimeError):
                receiver.deploy('images', RELEASE, verify_main=False)
        return [call.args for call in compose.call_args_list]

    def test_https_failure_restores_previous_release(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(receiver, 'ROOT', pathlib.Path(directory)), patch.object(receiver, 'validate_archive'), patch.object(receiver, 'run'), patch.object(receiver, 'encrypted_backup'), patch.object(receiver, 'compose') as compose, patch.object(receiver, 'accept_https', side_effect=RuntimeError('HTTPS failed')), patch.object(receiver.time, 'sleep'):
            calls = self.deploy_until_https_fails(directory, compose, agency_image=True)
            self.assertEqual(calls[-1][0], 'b' * 40)

    def test_rollback_without_agency_image_removes_failed_agency_container_before_restore(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(receiver, 'ROOT', pathlib.Path(directory)), patch.object(receiver, 'validate_archive'), patch.object(receiver, 'run'), patch.object(receiver, 'encrypted_backup'), patch.object(receiver, 'compose') as compose, patch.object(receiver, 'accept_https', side_effect=RuntimeError('HTTPS failed')), patch.object(receiver.time, 'sleep'):
            calls = self.deploy_until_https_fails(directory, compose, agency_image=False)
            removal = (RELEASE, 'rm', '--stop', '--force', 'agency')
            restore = calls[-1]
            self.assertIn(removal, calls)
            self.assertEqual(restore[0], 'b' * 40)
            self.assertEqual(restore[-3:], ('api', 'app', 'web'))
            self.assertLess(calls.index(removal), calls.index(restore))

    def test_rollback_without_agency_image_starts_only_api_app_web(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(receiver, 'ROOT', pathlib.Path(directory)), patch.object(receiver, 'validate_archive'), patch.object(receiver, 'run'), patch.object(receiver, 'encrypted_backup'), patch.object(receiver, 'compose') as compose, patch.object(receiver, 'accept_https', side_effect=RuntimeError('HTTPS failed')), patch.object(receiver.time, 'sleep'):
            calls = self.deploy_until_https_fails(directory, compose, agency_image=False)
            self.assertEqual(calls[-1][0], 'b' * 40)
            self.assertEqual(calls[-1][-3:], ('api', 'app', 'web'))
            self.assertNotIn('agency', calls[-1])
            self.assertIn('agency', calls[-2])

    def test_image_exists_is_false_when_the_agency_tag_is_missing(self):
        previous = 'b' * 40
        def fake_run(args, **kwargs):
            class Result:
                returncode = 1 if args[-1] == f'beacon-bold-agency:{previous}' else 0
                stdout = b''
                stderr = b''
            return Result()
        with patch.object(receiver.subprocess, 'run', side_effect=fake_run) as inspect:
            self.assertFalse(receiver.image_exists('agency', previous))
            self.assertTrue(receiver.image_exists('agency', 'c' * 40))
            self.assertFalse(receiver.image_exists('api', 'c' * 40))
            self.assertEqual(receiver.runtime_for(previous), ('api', 'app', 'web'))
            self.assertEqual(receiver.runtime_for('c' * 40), ('api', 'app', 'web', 'agency'))
            for call in inspect.call_args_list:
                self.assertEqual(call.args[0][:3], ['docker', 'image', 'inspect'])
                self.assertTrue(str(call.args[0][3]).startswith('beacon-bold-agency:'))

    def test_rollback_with_agency_image_starts_agency(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(receiver, 'ROOT', pathlib.Path(directory)), patch.object(receiver, 'validate_archive'), patch.object(receiver, 'run'), patch.object(receiver, 'encrypted_backup'), patch.object(receiver, 'compose') as compose, patch.object(receiver, 'accept_https', side_effect=RuntimeError('HTTPS failed')), patch.object(receiver.time, 'sleep'):
            calls = self.deploy_until_https_fails(directory, compose, agency_image=True)
            self.assertEqual(calls[-1][0], 'b' * 40)
            self.assertEqual(calls[-1][-4:], ('api', 'app', 'web', 'agency'))

if __name__ == '__main__':
    unittest.main()
