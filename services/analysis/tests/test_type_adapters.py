import uuid
import json
from unittest.mock import MagicMock
from src.models import GUID, StringArray


def test_guid_postgresql_dialect():
    """Test GUID type adapter with PostgreSQL dialect."""
    guid = GUID()
    mock_dialect = MagicMock()
    mock_dialect.name = 'postgresql'

    # Test load_dialect_impl for PostgreSQL
    impl = guid.load_dialect_impl(mock_dialect)
    assert impl is not None


def test_guid_non_postgresql_dialect():
    """Test GUID type adapter with non-PostgreSQL dialect."""
    guid = GUID()
    mock_dialect = MagicMock()
    mock_dialect.name = 'sqlite'

    # Test load_dialect_impl for non-PostgreSQL
    impl = guid.load_dialect_impl(mock_dialect)
    assert impl is not None


def test_guid_process_bind_param_postgresql():
    """Test GUID process_bind_param with PostgreSQL."""
    guid = GUID()
    mock_dialect = MagicMock()
    mock_dialect.name = 'postgresql'

    test_uuid = uuid.uuid4()
    result = guid.process_bind_param(test_uuid, mock_dialect)
    assert result == test_uuid

    # Test with None
    result = guid.process_bind_param(None, mock_dialect)
    assert result is None


def test_guid_process_bind_param_non_postgresql():
    """Test GUID process_bind_param with non-PostgreSQL."""
    guid = GUID()
    mock_dialect = MagicMock()
    mock_dialect.name = 'sqlite'

    test_uuid = uuid.uuid4()
    result = guid.process_bind_param(test_uuid, mock_dialect)
    assert result == str(test_uuid)

    # Test with string value
    uuid_str = str(test_uuid)
    result = guid.process_bind_param(uuid_str, mock_dialect)
    assert result == uuid_str

    # Test with None
    result = guid.process_bind_param(None, mock_dialect)
    assert result is None


def test_guid_process_result_value_postgresql():
    """Test GUID process_result_value with PostgreSQL."""
    guid = GUID()
    mock_dialect = MagicMock()
    mock_dialect.name = 'postgresql'

    test_uuid = uuid.uuid4()
    result = guid.process_result_value(test_uuid, mock_dialect)
    assert result == test_uuid

    # Test with None
    result = guid.process_result_value(None, mock_dialect)
    assert result is None


def test_guid_process_result_value_non_postgresql():
    """Test GUID process_result_value with non-PostgreSQL."""
    guid = GUID()
    mock_dialect = MagicMock()
    mock_dialect.name = 'sqlite'

    test_uuid = uuid.uuid4()
    uuid_str = str(test_uuid)
    result = guid.process_result_value(uuid_str, mock_dialect)
    assert isinstance(result, uuid.UUID)
    assert result == test_uuid

    # Test with None
    result = guid.process_result_value(None, mock_dialect)
    assert result is None

    # Test with already UUID value
    result = guid.process_result_value(test_uuid, mock_dialect)
    assert result == test_uuid


def test_string_array_postgresql_dialect():
    """Test StringArray type adapter with PostgreSQL dialect."""
    string_array = StringArray()
    mock_dialect = MagicMock()
    mock_dialect.name = 'postgresql'

    # Test load_dialect_impl for PostgreSQL
    impl = string_array.load_dialect_impl(mock_dialect)
    assert impl is not None


def test_string_array_non_postgresql_dialect():
    """Test StringArray type adapter with non-PostgreSQL dialect."""
    string_array = StringArray()
    mock_dialect = MagicMock()
    mock_dialect.name = 'sqlite'

    # Test load_dialect_impl for non-PostgreSQL
    impl = string_array.load_dialect_impl(mock_dialect)
    assert impl is not None


def test_string_array_process_bind_param_postgresql():
    """Test StringArray process_bind_param with PostgreSQL."""
    string_array = StringArray()
    mock_dialect = MagicMock()
    mock_dialect.name = 'postgresql'

    test_array = ["asset-1", "asset-2", "asset-3"]
    result = string_array.process_bind_param(test_array, mock_dialect)
    assert result == test_array

    # Test with None
    result = string_array.process_bind_param(None, mock_dialect)
    assert result is None


def test_string_array_process_bind_param_non_postgresql():
    """Test StringArray process_bind_param with non-PostgreSQL."""
    string_array = StringArray()
    mock_dialect = MagicMock()
    mock_dialect.name = 'sqlite'

    test_array = ["asset-1", "asset-2", "asset-3"]
    result = string_array.process_bind_param(test_array, mock_dialect)
    assert result == json.dumps(test_array)

    # Test with None
    result = string_array.process_bind_param(None, mock_dialect)
    assert result is None


def test_string_array_process_result_value_postgresql():
    """Test StringArray process_result_value with PostgreSQL."""
    string_array = StringArray()
    mock_dialect = MagicMock()
    mock_dialect.name = 'postgresql'

    test_array = ["asset-1", "asset-2", "asset-3"]
    result = string_array.process_result_value(test_array, mock_dialect)
    assert result == test_array

    # Test with None
    result = string_array.process_result_value(None, mock_dialect)
    assert result is None


def test_string_array_process_result_value_non_postgresql():
    """Test StringArray process_result_value with non-PostgreSQL."""
    string_array = StringArray()
    mock_dialect = MagicMock()
    mock_dialect.name = 'sqlite'

    test_array = ["asset-1", "asset-2", "asset-3"]
    json_str = json.dumps(test_array)
    result = string_array.process_result_value(json_str, mock_dialect)
    assert result == test_array

    # Test with None
    result = string_array.process_result_value(None, mock_dialect)
    assert result is None
