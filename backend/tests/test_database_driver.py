"""Load the production DBAPI without connecting to any database."""
import os
import subprocess
import sys

import pytest


@pytest.mark.parametrize('scheme', ['postgresql', 'postgres', 'postgresql+psycopg2'])
def test_postgresql_engine_loads_the_locked_driver(scheme):
    # Import configuration in a fresh process, as production does, without
    # freezing environment-dependent class attributes for unrelated app tests.
    result = subprocess.run(
        [sys.executable, '-c', """
from sqlalchemy import create_engine
from app.config import Config
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
assert engine.dialect.dbapi.__name__ == 'psycopg2'
assert engine.url.drivername == 'postgresql+psycopg2'
engine.dispose()
"""],
        env={**os.environ, 'DATABASE_URL': f'{scheme}://fixture:fixture@database.invalid/fixture'},
        capture_output=True, text=True, timeout=10,
    )
    assert result.returncode == 0, result.stderr


def test_sqlite_engine_remains_available():
    result = subprocess.run(
        [sys.executable, '-c', """
from sqlalchemy import create_engine
from app.config import Config
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
with engine.connect() as connection:
    assert connection.exec_driver_sql('SELECT 1').scalar() == 1
engine.dispose()
"""],
        env={**os.environ, 'DATABASE_URL': 'sqlite:///:memory:'},
        capture_output=True, text=True, timeout=10,
    )
    assert result.returncode == 0, result.stderr
