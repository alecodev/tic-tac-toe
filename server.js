let WebSocketServer=require('websocket').server,
	http=require('http'),
	server=http.createServer(function(request, response){
		console.log((new Date()) + ' Received request for ' + request.url);
		response.writeHead(404);
		response.end();
	});
server.listen(8000, ()=>{
	console.log((new Date()) + ' Server is listening on port 8000');
});

wsServer=new WebSocketServer({httpServer: server, autoAcceptgames: false});

function SendMessage(connection, action=null, data=null){
	connection.sendUTF(JSON.stringify({action:action, data:data}));
}
let connections={}, games={};
wsServer.on('request', (request)=>{

	let connection=request.accept(null, request.origin);
	console.log((new Date()) + ' Connection accepted.');
	connection.on('message', (message)=>{
		if (message.type==='utf8'){
			console.log('Received Message: ' + message.utf8Data);
			let data=null;
			try {
				data=JSON.parse(message.utf8Data);
				if (!('action' in data)){
					throw '';
				}
			}catch(e){
				console.error('Error data no es JSON');
				return
			}
			switch (data.action){
				case 'new-game':
					games[data.id]={'user-1':connection};
					connections[connection]=data.id;
					SendMessage(connection, 'game', 'ok');
					break;
				case 'join-game':
					if (!(data.id in games)){
						SendMessage(connection, 'fail-not-exist', 'Error no existe la partida');
					}else if ('user-2' in games[data.id]){
						SendMessage(connection, 'fail-ready', 'Error el user 2 ya se encuentra en la partida');
					}else{
						games[data.id]['user-2']=connection;
						connections[connection]=data.id;
						SendMessage(connection, 'game', 'ok');
						for (const user in games[data.id]){
							if (games[data.id][user]!=connection){
								SendMessage(games[data.id][user], 'user-2-connected', data.data);
							}
						}
					}
					break;
				case 'send-move':
					for (const user in games[data.id]){
						if (games[data.id][user]!=connection){
							SendMessage(games[data.id][user], 'send-move', data.data);
						}
					}
					break;
				case 'reload':
					for (const user in games[data.id]){
						if (games[data.id][user]!=connection){
							SendMessage(games[data.id][user], 'reload');
						}
					}
					break;
				case 'set-user':
					for (const user in games[data.id]){
						if (games[data.id][user]!=connection){
							SendMessage(games[data.id][user], 'set-user', data.data);
						}
					}
					break;
				default:
					console.error('Error action no parametrizada')
					break;
			}
		}
		else if (message.type==='binary'){
			console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
			connection.sendBytes(message.binaryData);
		}
	});
	connection.on('close', function(reasonCode, description){
		let id=connections[connection];
		delete connections[connection];

		for (const conn in games[id]){
			if (games[id][conn]==connection){
				delete games[id][conn];
			}
		}
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
	});
});