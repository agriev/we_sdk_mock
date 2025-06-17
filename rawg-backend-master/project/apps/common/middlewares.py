from admin_reorder.middleware import ModelAdminReorder as ModelAdminReorderBase
from django.urls import reverse


class ModelAdminReorderMiddleware(ModelAdminReorderBase):
    def process_model(self, model_config):
        if 'admin_url' in model_config:
            return {
                'name': model_config['label'],
                'admin_url': reverse(model_config['admin_url']),
            }
        return super().process_model(model_config)
