from unittest.mock import patch, MagicMock
from src.database import get_db, SessionLocal


def test_get_db_yields_session():
    """Test that get_db yields a database session."""
    db_gen = get_db()
    db = next(db_gen)

    assert db is not None
    assert isinstance(db, type(SessionLocal()))

    # Clean up
    try:
        next(db_gen)
    except StopIteration:
        pass


def test_get_db_closes_session():
    """Test that get_db closes the session after use."""
    mock_session = MagicMock()

    with patch('src.database.SessionLocal', return_value=mock_session):
        db_gen = get_db()
        db = next(db_gen)

        assert db == mock_session

        # Trigger cleanup
        try:
            db_gen.close()
        except:
            pass

        mock_session.close.assert_called_once()


def test_get_db_closes_on_exception():
    """Test that get_db closes the session even if an exception occurs."""
    mock_session = MagicMock()

    with patch('src.database.SessionLocal', return_value=mock_session):
        db_gen = get_db()
        db = next(db_gen)

        # Simulate exception by sending one into the generator
        try:
            db_gen.throw(Exception("Test exception"))
        except Exception:
            pass

        mock_session.close.assert_called_once()
