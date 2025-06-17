from django import forms
from django.core.exceptions import ValidationError

from apps.stories.models import GameStory
from apps.stories.stories import StoryGenerator
from apps.stories.tasks import make_download


class GameStoryInlineAdminForm(forms.ModelForm):
    url = 'https://youtu.be'
    message = f'Enter a valid Youtube link starting with {url}'

    def clean_youtube_link(self):
        youtube_link = self.cleaned_data.get('youtube_link')
        if youtube_link and not youtube_link.startswith(self.url):
            raise ValidationError(self.message)
        return youtube_link

    class Meta:
        model = GameStory
        exclude = ()


class DownloadAdminForm(forms.Form):
    clip_length = forms.IntegerField(
        min_value=1,
        max_value=StoryGenerator.clip_length,
        required=False,
        help_text='Limit clip length',
    )
    clips_count = forms.IntegerField(
        min_value=1,
        required=False,
        help_text='Limit count of clips',
    )

    def save(self, story, user):
        make_download.delay(story.id, self.cleaned_data['clip_length'], self.cleaned_data['clips_count'])
        return True
