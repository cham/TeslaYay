/*
  Nested Quotes object
*/
function NestedQuote($node){
  this.$node = $node;
  this.labels = {
    'up'  : 'Show older',
    'down': 'Hide'
  };
  this.doNesting();
}
NestedQuote.prototype.doNesting = function(){
  var $nestedQuote = this.$node.find('.tquote:first');
  
  if($nestedQuote.length){
    this.applyNesting($nestedQuote);
  }
};
NestedQuote.prototype.makeToggle = function($quoteToToggle){
  var $toggle = $('<a href="#" class="quote-nested-toggle"></a>').text(this.labels.up),
      labels = this.labels;

  $toggle.click(function(e){
    e.preventDefault();
    
    if($quoteToToggle.is(':hidden')){
      $toggle.text(labels.down);
      $quoteToToggle.show();
    }else{
      $toggle.text(labels.up);
      $quoteToToggle.hide();
    }
  });
  return $toggle;
};
NestedQuote.prototype.skipToggle = function($quoteToSkip){
  var $fragment = $quoteToSkip.clone(),
      $nextFragment = this.$node.clone();

  $fragment.add($nextFragment).find('.tqname').remove();
  $fragment.add($nextFragment).find('img').each(function(){
    var $img = $(this);
    $img.before('<span>'+$img.attr('href')+'</span>');
  });
  return $fragment.text() === $nextFragment.text();
};
NestedQuote.prototype.applyNesting = function($childQuote){
  if(!$childQuote){
    return;
  }
  if(this.skipToggle($childQuote)){
    return this.applyNesting($childQuote.find('.tquote:first'));
  }

  $childQuote.before(this.makeToggle($childQuote));
  $childQuote.hide();
};

if($('.welcome a:first').length){
  $('.you').html($('<div>').append($('.welcome a:first').clone()).html());
}

(function () {
  var title, tpl = $("#title-input").html();

  $("#main-title.changeling").bind("click", function(){
    if ($(this).is(":not(.editing)")) {
      title = $.trim($('h3', this).text());
      $(this).addClass("editing");
      $('h3', this).empty().append(tpl);
      var input = $(this).find("#title-input");
      input.val(title);
      input[0].focus();
      input[0].select();
    }
  });

  $('.youtube_wrapper').on("click", function() {
    var obj = $(this);
    if (!obj.data('active')) {
      obj.data('active', true);
      $(this).html('<iframe width="' + obj.width() + '" height="' +
                   obj.height() + '" src="http://www.youtube.com/embed/' +
                   obj.attr('id') + '?autoplay=1' + obj.data('extra') +
                   '" frameborder="0" allowfullscreen></iframe><br />');
    }
  });

  $("body").on("click", "#cancel-title", function(){
    $('h3', "#main-title").empty().text(title);
    $("#main-title").removeClass("editing");
  });

  $("body").on("click", "#save-title", function(){
    var newTitle = $("#title-input").val();
    var data = "title=" + encodeURIComponent(newTitle);
    data += isThread() ? "&thread_id=" + thread.id() : '';
    $.ajax({
      type: "POST",
      url: "/title/edit",
      data: data,
      success: function(msg){
        $('h3', "#main-title").empty().text(newTitle);
	$("#main-title").removeClass("editing");
      }
    });
  });
})();

$('#toggle-html').bind('click', function(){
  $.get('/ajax/toggle_html/'+ session_id, function(data) {
    window.location.reload(true);
  });
});

$('.hide-thread').bind('click', function(e){
  e.preventDefault();
  e.stopPropagation();

  var button = $(this),
      toHide = button.hasClass('added'),
      threadurl = button.attr('href'),
      threadid = button.data('id');

  $.ajax({
    method: 'put',
    url: threadurl,
    data: {
      threadid: threadid
    },
    success: function(data) {
      button.toggleClass('added', !toHide);
      button.parent('.five').parent('.thread').slideUp().next().slideUp();
    }
  });
});

$('.favourite').bind('click', function(e){
  e.preventDefault();
  e.stopPropagation();

  var button = $(this),
      threadurl = button.attr('href'),
      threadid = button.data('id');

  $.ajax({
    method: 'put',
    url: threadurl,
    data: {
      threadid: threadid
    },
    success: function(data){
      button.toggleClass('added');
    }
  });
});


function isThread() {
  return (typeof(window.thread) == "undefined")?  false: true;
}


(function() {
/*
  var $input = $('#thread-content-input');
  var $form = $input.parents('form');
  var key = document.title;

  var hasStorage = (function() {
    try {
      return !!localStorage.getItem;
    } catch(e) {
      return false;
    }
  }());

  if ($input.length !== 0 && hasStorage) {

    if (localStorage.getItem(key)) {
      $input.val(localStorage.getItem(key));
    }

    $input.bind('keyup change', function() {
      localStorage.setItem(key, $input.val());
    });
  }


  $form.bind('submit', function(e) {

    e.preventDefault();
    e.stopPropagation();

    if ($input.val().length === 0) {
      return false;
    }

    $form.find('[type=submit]').attr('disabled', 'disabled');

    var data = {
          content: $input.val()
        },
        mode = document.location.pathname === '/newthread' ? 'newthread' : 'comment';

    if(mode === 'newthread') {
      data.name = $form.find('#name').val();
      data['categories[]'] = $form.find('#category-selector input:checked').val();
    }
    if(mode === 'comment'){
      data.threadid = $form.find('input[name=threadid]').val();
    }

    $.ajax({
      type: 'POST',
      url: $form.attr('action'),
      data: data
    }).then(function(data, statusStr, response){
      if(hasStorage){
        localStorage.removeItem(key);
      }
      if(response.status === 200 && mode === 'newthread'){
        document.location.href = '/thread/' + data.urlname;
      }else{
        document.location.reload();
      }
    }).fail(function(response){
      $form.find('[type=submit]').removeAttr('disabled');
      $('#ajax_errs').remove();
      $form.prepend('<div id="ajax_errs">Please correct the errors and try again</div>');
    });
  });
*/
  var defaultLoginBox = $('#login-box').html();
  $('#login-form').on('submit', function(e) {
    e.preventDefault();

    var data = {
      username: $('#username').val(),
      password: $('#password').val()
    };

    $.ajax({
      url: '/login', type: 'POST', data: data
    }).fail(function(data) {
      $('.error').text(JSON.parse(data.responseText).error);
    }).then(function() {
      window.location.reload();
    });
  });


  $('#forgot-password').on('click', function(e){
    e.preventDefault();
    $('#login-box').load('/auth/forgot_password');
  });

  $('#forgot-request').on('submit', function(e){
    e.preventDefault();

    var data = {
      email: $('#forgot-email').val(),
      key: $('#forgot-key').val()
    };

    $.ajax({
      url: '/auth/forgot_password', type: 'POST', data: data
    }).fail(function(data) {
      $('.error').text(JSON.parse(data.responseText).error);
    }).then(function(data) {
      $('#login-box').html(defaultLoginBox);
      $('.error').text('Password reset email sent');
    });

  });

  $('#forgot-back').on('click', function(e){
    e.preventDefault();
    $('#login-box').html(defaultLoginBox);
  });

  $('#hide-ads').on('click', function(e){
    e.preventDefault();

    $.ajax({
      url: '/ajax/hide_ads/'+session_id,
      success: function(data){
        if (data == 1) {
          window.location.reload(false);
        }
      }
    });
  });

  $('#unhide-ads').on('click', function(e){
    e.preventDefault();

    $.ajax({
      url: '/ajax/show_ads/'+session_id,
      success: function(data){
        if (data == 1) {
          window.location.reload(false);
        }
      }
    });
  });

  // buddy/ignore switching links
  $('.remove-acq, .toggle-acq').click(function(e){
    e.preventDefault();

    var $this = $(this),
        $parent = $(this).parent(),
        username = $(this).attr('rel'),
        reltypes = ['ignore','buddy'],
        relindex = $parent.filter('.buddy-listing').length,
        switchBuddyStatus = $this.hasClass('toggle-acq'),
        command = reltypes[relindex];

    // always remove
    $.ajax({
      method: 'post',
      url: '/buddies',
      data: {
        command: command,
        username: username,
        remove: true
      },
      success: function(data){
        var $userblock = $parent.detach();

        // add new association
        if(!switchBuddyStatus){ return; }

        command = reltypes[1-relindex];
        $.ajax({
          method: 'post',
          url: '/buddies',
          data: {
            command: command,
            username: username
          },
          success: function(data){
            if(command === 'ignore'){
              $userblock.removeClass('buddy-listing').addClass('enemy-listing');
              $userblock.find('.toggle-acq').text('buddilize');
              return $('#enemy-listings').append($userblock);
            }

            $userblock.removeClass('enemy-listing').addClass('buddy-listing');
            $userblock.find('.toggle-acq').text('ignore');
            $('#buddy-listings').append($userblock);
          }
        });
      }
    });

  });

  // points
  var $pointsButtons = $('.give-point, .take-point');
  $pointsButtons.click(function(e){
    var $this = $(this);

    e.preventDefault();

    $.ajax({
      url: '/ajax/give_point/' + $this.data('commentid') + '/' + $this.data('type') + '/' + session_id,
      success: function(data){
        var numPoints = parseInt(data, 10);

        if(isNaN(numPoints)){
          $this.parent().find('.current-points').show().text('Error!');
        }else{
          $this.parent().find('.current-points').show().text(numPoints + ' point' + (numPoints !== 1 ? 's' : ''));
          $pointsButtons.remove();
        }
      }
    });
  });

  // keyboard nav
  function createKeyboardNavListener(){
    var ignore = ['input','textarea','button'],
        routing = [
          {
            seq: [113,116], //qt
            path: '/'
          },
          {
            seq: [113,112], //qp
            path: '/f/participated'
          },
          {
            seq: [113,102], //qf
            path: '/f/favorites'
          },
          {
            seq: [113,104], //qh
            path: '/f/hidden'
          },
          {
            seq: [113,109], //qm
            path: '/messages/inbox'
          },
          {
            seq: [113,117], //qu
            path: '/users'
          }
        ],
        currentSequence = [],
        matchingRoute;

    return function(e){
      if(ignore.indexOf(e.target.nodeName.toLowerCase()) !== -1){
        return;
      }

      currentSequence.push(e.which);
      currentSequence = currentSequence.slice(-2);

      matchingRoute = _(routing).find(function(route){
        return _(route.seq).isEqual(currentSequence);
      });
      if(matchingRoute){
        self.location = matchingRoute.path;
      }
    };
  }
  $('body').keypress(createKeyboardNavListener());

  // collpase quotes
  var $quotes = $('.content > .tquote > .tquote');
  $quotes.each(function(i){
    new NestedQuote($(this));
  });

  $('.buddyform').each(function(){
    var $form = $(this);

  });

})();