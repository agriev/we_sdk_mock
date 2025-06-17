from django.contrib import admin
from django.contrib.admin.actions import delete_selected as _delete_selected
from django.core.exceptions import PermissionDenied
from django.http.response import HttpResponseRedirect
from django.shortcuts import render

from apps.games.forms import MergeGamesAdminForm
from apps.games.models import Game
from apps.merger.models import DeletedGame, SimilarGame


def delete_selected_custom(model_admin, request, queryset):
    if request.POST.get('post'):
        bulk_create = [DeletedGame(game_name=game.name) for game in queryset]
        DeletedGame.objects.bulk_create(bulk_create)
    return _delete_selected(model_admin, request, queryset)


delete_selected_custom.short_description = 'Delete selected Games'
delete_selected_custom.allowed_permissions = ('delete_custom',)


def merge_games(model_admin, request, queryset):
    if not request.user.has_perm('games.merge_games'):
        raise PermissionDenied
    form = None
    data = request.POST.getlist(admin.ACTION_CHECKBOX_NAME)
    if len(data) != 2:
        model_admin.message_user(request, 'Only 2 games could be merged')
        return HttpResponseRedirect(request.get_full_path())
    initial = {'_selected_action': data}
    if 'apply' in request.POST:
        form = MergeGamesAdminForm(data=request.POST, request=request, initial=initial)
        items = Game.objects.filter(id__in=initial['_selected_action'])
        first = items.first()
        second = items.last()
        if form.is_valid():
            similar, _ = SimilarGame.objects.get_or_create(first_game=first, second_game=second)
            similar.merge(form.cleaned_data['similar'], request.user.id)
            model_admin.message_user(request, 'Games will be merged')
            return HttpResponseRedirect(request.get_full_path())
    if not form:
        form = MergeGamesAdminForm(request=request, initial=initial)
    return render(request, 'admin/games/merge_games.html', {
        'form': form,
        'title': 'Merge games'
    })


merge_games.short_description = 'Merge games'
merge_games.allowed_permissions = ('merge',)
