from django.contrib import admin
from django.http.response import HttpResponseRedirect
from django.shortcuts import render

from apps.merger.forms import AdminMergeGamesForm
from apps.merger.models import SimilarGame


def merge_games(model_admin, request, queryset):
    form = None
    initial = {'_selected_action': request.POST.getlist(admin.ACTION_CHECKBOX_NAME)}
    if 'apply' in request.POST:
        form = AdminMergeGamesForm(data=request.POST, request=request, initial=initial)
        if form.is_valid():
            items = SimilarGame.objects.filter(id__in=form.cleaned_data['_selected_action'])
            for similar in items:
                similar.merge(form.cleaned_data['similar_{}'.format(similar.id)], request.user.id)
            count = len(items)
            model_admin.message_user(request, '{} game{} will be merged'.format(count, 's' if count > 1 else ''))
            return HttpResponseRedirect(request.get_full_path())
    if not form:
        form = AdminMergeGamesForm(request=request, initial=initial)
    return render(request, 'admin/merger/merge_games.html', {
        'form': form,
        'title': 'Merge games'
    })


merge_games.short_description = 'Merge games'
