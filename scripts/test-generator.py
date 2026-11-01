#!/usr/bin/env python3
"""Offline end-to-end regression checks; requires Python 3.11+ and Node.js."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import tomllib

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / 'scripts/generate.mjs'

with tempfile.TemporaryDirectory(prefix='brain-generator-test-') as work:
    work = Path(work)
    commands = work / 'bin'
    commands.mkdir()
    # Valid model strings must survive serialization without changing meaning.
    categories = [r'Migrate C:\Data archives', r'Use \n and \t literally', 'Review """quoted""" contracts']
    stub = commands / 'gemini'
    stub.write_text('#!' + sys.executable + '\nprint(' + repr(json.dumps({'decision_types': categories})) + ')\n')
    stub.chmod(0o755)
    env = {**os.environ, 'PATH': str(commands) + os.pathsep + os.environ['PATH']}
    vault = work / 'vault'
    result = subprocess.run(['node', str(GENERATOR), 'software', '10', '--cli', 'gemini',
                             '--out', str(vault), '--no-open', '--no-zip'],
                            cwd=work, env=env, text=True, capture_output=True, check=True)
    assert 'Source: gemini' in result.stdout, result.stdout + result.stderr
    for path in (vault / '.gemini/commands').glob('*.toml'):
        command = tomllib.loads(path.read_text())
        assert isinstance(command['prompt'], str)
        if path.stem == 'build-advisor':
            for category in categories:
                assert category in command['prompt'], repr(command['prompt'])
    guide = (vault / 'AGENTS.md').read_text()
    assert 'Before reading or changing files in a folder' in guide
    assert 'AGENTS.md' in guide and 'vault root down to that folder' in guide
    start = (vault / 'START_HERE.md').read_text()
    assert 'rather than every descendant guide' in start
    assert 'every folder\'s `AGENTS.md` automatically' not in start
    # Generic generation must remain consistent with checked-in templates.
    subprocess.run(['node', str(GENERATOR), '--skeleton'], cwd=work, check=True, capture_output=True)
    import re
    normalize = lambda text: re.sub(r'\b\d{4}-\d{2}-\d{2}\b', 'DATE', text)
    generated = work / 'skeleton'
    expected = ROOT / 'skeleton'
    paths = {p.relative_to(generated) for p in generated.rglob('*') if p.is_file()}
    assert paths == {p.relative_to(expected) for p in expected.rglob('*') if p.is_file()}
    for rel in paths:
        assert normalize((generated / rel).read_text()) == normalize((expected / rel).read_text()), str(rel)
print('PASS: personalized TOML round-trip, folder guidance, and skeleton consistency')
