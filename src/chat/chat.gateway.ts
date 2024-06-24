import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from 'src/message/dto/create-message.dto';
import { UsersService } from 'src/users/users.service';


interface OnlineUser {
  userId: number;
  socketId: string;
}

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private userSocketsMap = {};

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UsersService,
  ) { }

  async handleConnection(client: Socket, ...args: any[]) {
    const userId = client.handshake.query.userId;
    const user = await this.userService.findOne(+userId);

    // Agregar al namespace
    const onlineUser: OnlineUser = {
      userId: user.id,
      socketId: client.id,
    };

    client.data.user = onlineUser;

    // Actualizar lista global
    this.userSocketsMap[onlineUser.userId] = onlineUser;

    try {
      // obtener mensajes offline
      const offlineMessages = await this.chatService.getOfflineMessages(user.id);
      if (offlineMessages?.length) {
        offlineMessages.forEach(message => {
          client.emit('newMessage', message);
        });
      }
    } catch (error) {
      console.error('Error fetching offline messages: ', error);
    }

    console.log(`list of users:  ${JSON.stringify(this.userSocketsMap)}`);
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      delete this.userSocketsMap[client.data.user.userId];
      console.log(`list of users actual:  ${JSON.stringify(this.userSocketsMap)}`);
    }
  }

  getReceivingUserSocket(userId: number) {
    // Encontrar el socketId mapeado
    const socketInfo = this.userSocketsMap[userId];

    if (!socketInfo) {
      // manejar error
      console.log('No existe un usuario conectado con ese id')
      return false;
    }

    // Obtener el socket 
    const socket = this.server.of("/").sockets.get(socketInfo.socketId);

    if (!socket) {
      // manejar error
      console.log('Socket no encontrado')
    }

    return socket;
  }

  /**
   * INGRESAR A UN CHAT YA CREADO
   * @param client 
   * @param payload 
   */
  @SubscribeMessage('chatJoined')
  async joinChat(client: Socket, payload: { chat: string, senderUserId: number, receivingUserId: number, fondo: string }) {
    const { senderUserId, receivingUserId } = payload;
    console.log('joinedChat', payload)

    // Check if the chat already exists or create a new one
    const existingChat = await this.chatService.findExistingChat(senderUserId, receivingUserId);

    if (existingChat) {
      //Traer las conversaciones
      const messages = await this.chatService.getMessagesByChatId(existingChat.id);
      console.log('MENSAJES CHAT', messages)

      //Enviar los mensajes
      client.emit('messagesLoaded', messages);

      // Optionally, you can emit an event or perform actions related to the joined chat
      this.server.to(existingChat.id.toString()).emit('userJoined', { userId: senderUserId, action: 'joined' });
    }
  }

  /**
   * ENVIAR UN MENSAJE A CHAT YA CREADO
   * @param client 
   * @param payload 
   */
  @SubscribeMessage('sendMessage')
  async sendMessage(client: Socket, payload: { receivingUserId: number, message: CreateMessageDto, audioFile?: Buffer }) {
    console.log('PAYLOAD SEND MSG', payload)

    const { receivingUserId, message, audioFile } = payload;
    let savedMessage;

    try {
      if (message.resources[0].type !== 'A' || !audioFile) {
        // Save the message
        savedMessage = await this.chatService.sendMessage(message, receivingUserId);
        console.log('text',savedMessage)
      } else {
        // Save the message
        savedMessage = await this.chatService.sendMessage(message, receivingUserId, audioFile);
        console.log('audio',savedMessage)
      }
    } catch (error) {
      console.error('Error sending message: ', error);
      return;
    }

    // Emit the message to the sender
    client.emit('newMessage', savedMessage);
    console.log('SAVED MESSAGE', savedMessage)

    // Obtener socket del receptor
    const receivingSocket: Socket | false = this.getReceivingUserSocket(receivingUserId);

    if (receivingSocket) {
      // En línea, emitimos 
      receivingSocket.emit('newMessage', savedMessage);

      // emitir notificación al receptor
      const sender = await this.userService.findOne(message.userId);

      receivingSocket.emit('newMessageNotification', {
        type: 'message',
        message: savedMessage.text[0]?.textOrigin || savedMessage.image[0]?.url || savedMessage.audio[0]?.translatedAudioUrl,
        senderName: sender.name,
        senderPhoto: sender.photo_url,
      });
    } else {
      // No conectado, guardar evento en BD    
      const offlineMessage = {
        senderId: message.userId,
        receiverId: receivingUserId,
        content: savedMessage.text[0]?.textOrigin || savedMessage.image[0]?.url || savedMessage.audio[0]?.translatedAudioUrl || savedMessage.video[0]?.url,
      }

      // Guardar en BD
      await this.chatService.saveOfflineMessage(offlineMessage);
    }
  }

  @SubscribeMessage('typing')
  async typing(client: Socket, payload: { room: string, message: string }) {
    const { room, message } = payload;
    this.server.to(room).emit('typing', message);
  }

  @SubscribeMessage('leave_chat')
  handleRoomLeave(client: Socket, room: string) {
    console.log(`chao room_${room}`)
    client.leave(room);
  }
}