$(function() {
    $('#search-facets').delegate('li.facet', 'click', function(e) {
        var $this = $(this);
        if ($this.hasClass('active')) {
            var $tgt = $(e.target);
            if ($tgt.is('a')) {
                $tgt.closest('.facet-group').find('.selected')
                    .removeClass('selected');
                $tgt.closest('li').addClass('selected');
                return;
            }
            $this.removeClass('active');
        } else {
            $this.closest('ul').find('.active').removeClass('active');
            $this.addClass('active');
        }
    });

    if ($('body').hasClass('pjax') && $.support.pjax) {
        initSearchPjax('#pjax-results');
    }
});


function initSearchPjax(container) {
    var $container = $(container),
        timeouts = 0;

    function pjaxOpen(url) {
        var urlBase = location.pathname + location.search;
        if (!!url && url != '#' && url != urlBase) {
            $.pjax({
                url: url,
                container: container,
                timeout: 1500,
                beforeSend: function(xhr) {
                    this.trigger('begin.pjax', [xhr, url, container]);
                    xhr.setRequestHeader('X-PJAX', 'true');
                    loading();
                },
                error: function(xhr, textStatus, errorThrown) {
                    if (textStatus === 'timeout' && timeouts < 5) {
                        // Retry up to five times.
                        timeouts++;
                        return pjaxOpen(url);
                    }
                    if (textStatus !== 'abort') {
                        // Upon `error` or `parsererror`.
                        window.location = url;
                    }
                },
                complete: function(xhr) {
                    this.trigger('end.pjax', [xhr, url, container]);
                    finished();
                }
            });
        }
    }

    function hijackLink() {
        var $this = $(this);
        // Supress clicks on the currently selected sort filter.
        if (!($this.parent('li.selected').length &&
              $this.closest('#sorter').length)) {
            pjaxOpen($(this).attr('href'));
        }
    }

    function loading() {
        var $wrapper = $container.closest('.results'),
            msg = gettext('Updating results&hellip;'),
            cls = 'updating';
        $wrapper.addClass('loading');

        // The loading throbber is absolutely positioned atop the
        // search results, so we do this to ensure a max-margin of sorts.
        if ($container.outerHeight() > 300) {
            cls += ' tall';
        }

        // Insert the loading throbber.
        $('<div>', {'class': cls, 'html': msg}).insertBefore($container);
    }

    function finished() {
        var $wrapper = $container.closest('.results');

        // Initialize install buttons and compatibility checking.
        $.when($container.find('.install:not(.triggered)')
                         .installButton()).done(function() {
            $container.find('.install').addClass('triggered');
            initListingCompat();
        });

        // Remove the loading indicator.
        $wrapper.removeClass('loading').find('.updating').remove();

        // Update # of results on sidebar.
        var oldCount = $('#search-facets .cnt').attr('data-count'),
            numItems = $wrapper.find('.item').length.toString(10),
            newCount = ($wrapper.find('b.cnt').attr('data-count') || numItems),
            newCountFmt = ($wrapper.find('b.cnt').text() || numItems);
        if (oldCount != newCount) {
            // Update old numeric count.
            $('#search-facets .cnt').attr('data-count', newCount);

            // Update old formatted count.
            var msg = ngettext('<b>{0}</b> matching result',
                               '<b>{0}</b> matching results',
                               parseInt(newCount, 10));
            $('#search-facets .cnt').html(format(msg, [newCountFmt]));
        }

        // Scroll up.
        $('html, body').animate({scrollTop: 0}, 200);
    }

    function turnPages(e) {
        if (fieldFocused(e)) {
            return;
        }
        if (e.which == $.ui.keyCode.LEFT || e.which == $.ui.keyCode.RIGHT) {
            e.preventDefault();
            var sel;
            if (e.which == $.ui.keyCode.LEFT) {
                sel = '.paginator .prev:not(.disabled)';
            } else {
                sel = '.paginator .next:not(.disabled)';
            }
            pjaxOpen($container.find(sel).attr('href'));
        }
    }

    $('.pjax-trigger a').live('click', _pd(hijackLink));
    $(document).keyup(_.throttle(turnPages, 300));
}
