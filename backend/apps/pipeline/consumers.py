"""
WebSocket consumers for Pipeline app.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class PipelineConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time pipeline monitoring.

    Receives updates about pipeline execution and sends them to connected clients.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.execution_id = self.scope['url_route']['kwargs']['execution_id']
        self.room_group_name = f'pipeline_{self.execution_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Receive message from WebSocket.
        (Optional: for client -> server communication)
        """
        pass

    async def pipeline_update(self, event):
        """
        Receive pipeline update from channel layer.
        Send to WebSocket.
        """
        await self.send(text_data=json.dumps({
            'type': 'pipeline_update',
            'execution_id': event['execution_id'],
            'stage': event['stage'],
            'status': event['status'],
            'progress': event['progress'],
            'message': event.get('message', ''),
            'error': event.get('error', None),
            'timestamp': event.get('timestamp', ''),
        }))
