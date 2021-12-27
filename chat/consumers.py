from channels.generic.websocket import AsyncWebsocketConsumer
import json


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'test_room'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print("Dissconected")

    async def receive(self, text_data=None, bytes_data=None):
        receive_dict = json.loads(text_data)
        message = receive_dict['message']

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send.message',
                'message': message
            }
        )

    async def send_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
                'message': message,
        }))
