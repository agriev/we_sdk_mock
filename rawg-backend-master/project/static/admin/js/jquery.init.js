var django = django || {};
django.jQuery = jQuery;

(function($) {
    $(document).ready(function () {
        $('.vDateField').parent().append('<br><span class="help">Format: DD-MM-YYYY.</span>');
    });
})(django.jQuery);
