$(function(){
    /* expander: load body and remove handle */
    $(".expander[data-article]").click(function(){
        var $this = $(this);
        $this.unbind();
        $this.html('<i class="fa fa-spinner fa-spin"/>');
        $.get("/ajax/articles/body/" + $this.attr("data-article"), function( res ) {
            $this.closest(".container").append( res );
            $this.remove();
        });
    });
});
