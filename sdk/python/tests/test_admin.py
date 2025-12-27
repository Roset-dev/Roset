from roset.admin import RosetAdmin

def test_admin_init():
    admin = RosetAdmin(api_url="https://api.test", api_key="test-key")
    assert admin.org is not None
    assert admin.integrations is not None
    assert admin.webhooks is not None

def test_admin_context_manager():
    with RosetAdmin(api_url="https://api.test", api_key="test-key") as admin:
        assert admin.webhooks is not None
        assert admin.billing is not None
