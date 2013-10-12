(function () {
	$('.message.header .marker input').bind('click', function(e){
		$('.message.lineitem .marker input').prop('checked', $(this).prop('checked'));
	});
	
	$('#inbox-mark-unread').bind('click', function(e){
		e.preventDefault();
		
		$('#message-form').attr({
			'action': '/messages/batch/unread',
			'method': 'post'
		});
		$('#message-form').submit();
	});
	
	$('#inbox-mark-read').bind('click', function(e){
		e.preventDefault();
		
		$('#message-form').attr({
			'action': '/messages/batch/read',
			'method': 'post'
		});
		$('#message-form').submit();
	});
	
	$('#inbox-delete').bind('click', function(e){
		e.preventDefault();
		
		if (confirm('Are you sure you want to delete the selected messages from your inbox?'))
		{
			$('#message-form').attr({
				'action': '/messages/batch/inboxdelete',
				'method': 'post'
			});
			$('#message-form').submit();
		}
	});
	
	$('#outbox-delete').bind('click', function(e){
		e.preventDefault();
		
		if (confirm('Are you sure you want to delete the selected messages from your outbox?'))
		{
			$('#message-form').attr({
				'action': '/messages/batch/outboxdelete',
				'method': 'post'
			});
			$('#message-form').submit();
		}
	});
})();