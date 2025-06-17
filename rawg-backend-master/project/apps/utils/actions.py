from django.contrib import admin, messages
from django.http.response import HttpResponseRedirect
from django.shortcuts import render

from apps.utils.forms import AdminMergeItemsForm


def merge_elements(model_admin, request, queryset):
    form = None
    initial = {'_selected_action': request.POST.getlist(admin.ACTION_CHECKBOX_NAME)}
    if 'apply' in request.POST:
        form = AdminMergeItemsForm(data=request.POST, model=model_admin.model, initial=initial)
        if form.is_valid():
            items = form.cleaned_data['_selected_action']
            item = model_admin.model.objects.get(id=form.cleaned_data['item'])
            item.merge([e for e in items if e != form.cleaned_data['item']], request.user.id)
            model_admin.message_user(request, '{} items will be merged'.format(len(items)))
            return HttpResponseRedirect(request.get_full_path())
    if not form:
        if len(initial['_selected_action']) < 2:
            model_admin.message_user(request, 'Please select al least two items', level=messages.WARNING)
            return HttpResponseRedirect(request.get_full_path())
        form = AdminMergeItemsForm(model=model_admin.model, initial=initial)
    return render(request, 'admin/utils/merge_items.html', {
        'form': form,
        'title': 'Merge items'
    })


merge_elements.short_description = 'Merge elements'
