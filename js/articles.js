/* Edit an Article using CRUD */
/* (c)copyright 2017 by Gerald Wodni<gerald.wodni@gmail.com> */
$(document).ready(function(){
    var $introTextarea = $('textarea[name="intro"]');
    var $bodyTextarea  = $('textarea[name="body"]' );

    var modes = {
        html: "html",
        markdown: "markdown",
        plaintext: "plain_text"
    }

    function textareaToAce( textareaName, aceId ) {
        var $sourceTextarea = $('textarea[name="' + textareaName + '"]');
        $sourceTextarea.after('<div id="' + aceId + '" class="form-control" style="height:400px"> </div>').hide();

        /* create editor */
        var editor = ace.edit(aceId);
        editor.getSession().setTabSize(4);
        editor.getSession().setUseSoftTabs(true);
        editor.getSession().setUseWrapMode(true);
        editor.setTheme("ace/theme/github");

        /* bind ace changed to textarea */
        editor.getSession().setValue($sourceTextarea.val());
        editor.getSession().on("change", function() {
            $sourceTextarea.val( editor.getSession().getValue() );
        });

        $('select[name="type"]').change(function() {
            editor.getSession().setMode( "ace/mode/" + modes[$(this).val()] );
        }).trigger("change");
    }

    textareaToAce( "intro", "articleIntro" );
    textareaToAce( "body", "articleBody" );
});
