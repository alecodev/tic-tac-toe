let WS=null, type=null, id=null, game_positions=[[null,null,null],[null,null,null],[null,null,null]], _init_=true;
$(()=>{
	let size=(($(document).width()>$(document).height())? 'h':'w');
	$('#tbl-game table').css({'height':'50v'+size,'width':'50v'+size});
	$('#tbl-game button').css('font-size','10v'+size);
	/**
	 * Función para generar el id de la partida
	 * @return string
	 */
	function _id(){
		return Math.random().toString(36).substr(2, 9);
	}
	$('#btn-new').click((e)=>{
		e.preventDefault();
		type=1;
		_init_=true;
		id=_id();
		Set_WebSocket();
		$('#ipt-user-2').attr('disabled', true).val('Jugador 2');
		$('#ipt-user-1').attr('disabled', false).val('Jugador 1');
	});
	$('#ipt-code').keydown((e)=>{
		if (e.which==13||e.which==32){
			e.preventDefault();
			$('#btn-join').click();
		}
	});
	$('#btn-join').click((e)=>{
		e.preventDefault();
		type=2;
		_init_=false;
		id=$('#ipt-code').val().trim();
		Set_WebSocket();
		$('#ipt-user-1').attr('disabled', true).val('Jugador 1');
		$('#ipt-user-2').attr('disabled', false).val('Jugador 2');
	});
	$('#modal-join')
		.on('hidden.bs.modal', (e)=>{
			$('#ipt-code').val('');
		})
		.on('shown.bs.modal', (e)=>{
			$('#ipt-code').focus();
		});
	$('#tbl-game button').off().click(function(e){
		e.preventDefault();
		$(this).html('<i class="bi bi-'+((type==1)? 'x-square-fill':'circle')+'"></i>').removeClass('btn-primary').addClass('btn-info').attr('disabled', true);
		$('#tbl-game button.btn-primary').attr('disabled', true);
		$('#lbl-status').html('Esperando la respuesta del otro participante');
		let col=$(this).parent()[0].cellIndex, row=$(this).parent().parent()[0].rowIndex;
		game_positions[row][col]=type;
		let p=game_positions;
		if ((p[row][0]!==null&&p[row][0]==p[row][1]&&p[row][0]==p[row][2])||(p[0][col]!==null&&p[0][col]==p[1][col]&&p[0][col]==p[2][col])){
			$('#lbl-status').html('Has ganado');
			$('#tbl-game button.btn-primary').attr('disabled', true);
			$('#btn-reload').show();
		}
		Send_WebSocket('send-move', {row:row, col:col});
	});
	$('#btn-reload').click(function(e){
		e.preventDefault();
		reload_game()
		Send_WebSocket('reload');
	});
	$('#ipt-user-1, #ipt-user-2').change(function(e){
		e.preventDefault();
		Send_WebSocket('set-user', $(this).val());
	});
});
function reload_game(){
	_init_=!_init_;
	$('#tbl-game button').removeClass('btn-info').addClass('btn-primary').html('');
	game_positions=[[null,null,null],[null,null,null],[null,null,null]];
	$('#lbl-status').html(((_init_)? 'Es tu turno':'Esperando la respuesta del otro participante'));
	$('#tbl-game button.btn-primary').attr('disabled', (!_init_));
	$('#btn-reload').hide();
}
function Send_WebSocket(action=null, data=null){
	WS.send(JSON.stringify({action:action, id:id, data:data}));
}
function Set_WebSocket(){
	if (type!==null&&WS===null){
		console.info('Inicializando conexión');
		let Server=new WebSocket(`ws://${_hostname}:${_port}`);
		Server.binaryType='arraybuffer';

		Server.onopen=(e)=>{
			if (WS===null){
				console.info('Conexión establecida');
				WS=Server;
				Send_WebSocket(((type==1)? 'new':'join')+'-game');
			}else{
				console.error('Error Conexión duplicada');
				WS.close();
			}
		};

		Server.onmessage=(e)=>{
			let info=null;
			try {
				info=JSON.parse(e.data);
			}catch(e){
				console.error(`Error la informacion del servidor JSON: ${e.data}`);
				return false;
			}
			if (!('action' in info && 'data' in info)){
				console.error('Error la informacion del servidor: ', info);
				return false;
			}
			switch (info.action){
				case 'game':
					if (info.data=='ok'){
						console.info('Partida iniciada');
						$('#layout-home').hide();
						$('#modal-join').modal('hide');
						$('#layout-game').show();
						$('#lbl-id-partida').html('ID de la partida: <span class="badge bg-info">'+id+'</span>');
						$('#lbl-status').html(((type==1)? 'Esperando que el otro participante  se conecte':'Esperando la respuesta del otro participante'));
						$('#tbl-game button.btn-primary').attr('disabled', true);
					}
					break;
				case 'user-2-connected':
					if (type==1){
						$('#lbl-status').html(((type==1)? 'Es tu turno':'Esperando la respuesta del otro participante'));
						$('#tbl-game button.btn-primary').attr('disabled', false);
					}
					break;
				case 'fail-not-exist':
					$('#ipt-code').val('');
					alert(info.data);
					break;
				case 'fail-ready':
					$('#ipt-code').val('');
					alert(info.data);
					break;
				case 'send-move':
					$('#lbl-status').html('Es tu turno');
					let row=info.data.row, col=info.data.col;
					$('#tbl-game button.btn-primary').attr('disabled', false);
					$('#tbl-game table tr:eq('+row+') td:eq('+col+') button').html('<i class="bi bi-'+((type==2)? 'x-square-fill':'circle')+'"></i>').removeClass('btn-primary').addClass('btn-info').attr('disabled', true);
					game_positions[row][col]=((type==1)? 2:1);
					let p=game_positions;
					if ((p[row][0]!==null&&p[row][0]==p[row][1]&&p[row][0]==p[row][2])||(p[0][col]!==null&&p[0][col]==p[1][col]&&p[0][col]==p[2][col])){
						$('#lbl-status').html('Ha ganado el otro participante');
						$('#tbl-game button.btn-primary').attr('disabled', true);
						$('#btn-reload').show();
					}
					break;
				case 'reload':
					reload_game();
					break;
				case 'set-user':
					$('#ipt-user-'+((type==1)? 2:1)).val(info.data);
					break;
				default:
					console.error(`Sin action parametrizar: ${info}`);
					break;
			}
		};

		Server.onclose=(e)=>{
			WS=null;
			$('#tbl-game button.btn-primary').attr('disabled', true);
			if (e.wasClean){
				console.info(`Conexión cerrada, code: ${e.code} reason: ${e.reason}`);
			}else{
				console.error('La conexión se cayó', e);
				alert('Se produjo un error en la conexión');
			}
		};

		Server.onerror=(e)=>{
			if (WS!==null){
				WS.close();
			}
			console.error('Se produjo un error', e);
		};
	}
}