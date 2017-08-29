$(function(){
    $.fn.forthEv = function _jq_forthEv( action, opts ) {
        opts = opts || {};
        /* stub for common functions */
    };

    /* expander: load body and remove handle */
    function loadExpander( evt ) {
        var $this = $(this);
        $this.unbind();
        $this.html('<i class="fa fa-spinner fa-spin"/>');
        $.get("/ajax/articles/body/" + $this.attr("data-article"), function( res ) {
            $this.closest(".container").append( res );
            $this.remove();
        });
    }

    /* page-offset-loaders */
    function loadOnScroll(evt){
        var $this = $(this);
        $this.unbind();
        var url =$this.attr("data-load-on-scroll");
        evt.preventDefault();
        $.get( url, function( res ) {
            $(".main-content").append( res );
            $this.closest(".pageNavigation").remove();
            updateDom();
        });
    }

    /* hide nojs-ui */
    function updateDom() {
        $(".nojs").remove();
        $("[data-load-on-scroll]").click(loadOnScroll);
        $(".expander[data-article]").click(loadExpander);
    }
    updateDom();

    /* helper function, taken from: http://stackoverflow.com/questions/487073/check-if-element-is-visible-after-scrolling */
    function isScrolledIntoView(el) {
        var elemTop = el.getBoundingClientRect().top;
        var elemBottom = el.getBoundingClientRect().bottom;

        var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);
        return isVisible;
    }

    /* detect end of page scroll */
    window.onscroll = function( evt ) {
        var $dataLoadOnScroll = $("[data-load-on-scroll]");
        if( $dataLoadOnScroll.length > 0 && isScrolledIntoView( $dataLoadOnScroll.get(0) ) )
            $dataLoadOnScroll.trigger("click");
    }
});
