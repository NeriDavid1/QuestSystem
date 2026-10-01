import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class LetterOrderingContractTests(unittest.TestCase):
    def test_listening_catalog_uses_same_unity_config_and_distinct_image(self):
        seed = module('import_yaml_to_supabase')
        catalog = seed.catalog_bundle()[0]
        classic = next(e for e in catalog if e['kind'] == 'minigame' and e['external_id'] == 'letter_ordering')
        listening = next(e for e in catalog if e['kind'] == 'minigame' and e['external_id'] == 'listening_letter_ordering')
        self.assertEqual(classic['metadata']['unity_config'], listening['metadata']['unity_config'])
        self.assertIn('promptAudio', listening['metadata']['content_fields'])
        self.assertTrue((ROOT / '_registry' / listening['image_path']).is_file())
        self.assertEqual(seed.infer_minigame_id({'targetWord': 'bee'}), 'letter_ordering')
        self.assertEqual(seed.infer_minigame_id({'targetWord': 'bee', 'visualVariant': 'ListenAndBuild'}), 'listening_letter_ordering')

    def test_export_resolves_recording_and_enum_names(self):
        exporter = module('unity_to_yaml')
        fields = {'listening_letter_ordering': ['targetWord', 'visualVariant', 'hintMode', 'promptAudio']}
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            recording = root / 'Art' / 'Audio' / 'BEE.mp3'
            recording.parent.mkdir(parents=True)
            recording.touch()
            index = {'bee_guid': recording}
            params = exporter.extract_params('listening_letter_ordering', {
                'targetWord': 'bee', 'visualVariant': 1, 'hintMode': 0,
                'promptAudio': {'guid': 'bee_guid'},
            }, index, root, fields)
            self.assertEqual(params['visualVariant'], 'ListenAndBuild')
            self.assertEqual(params['hintMode'], 'AudioOnly')
            self.assertEqual(params['promptAudio'], 'Art/Audio/BEE.mp3')
            self.assertEqual(exporter.default_brief('listening_letter_ordering', {}, params)['target'], 'bee')


if __name__ == '__main__':
    unittest.main()
