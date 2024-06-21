import { Body, Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatGptAiService } from './chat-gpt-ai.service';
import { GetAiModelAnswer } from './model/get-ai-model-answe';
import { ApiTags } from '@nestjs/swagger';
import { GetModelFastAnswer } from './model/get-model-fast-answer';

@ApiTags('Chat')
@Controller('chat-gpt-ai')
export class ChatGptAiController {
    constructor(private chatService: ChatGptAiService) { }

    @Post("/message")
    @UsePipes(ValidationPipe)
    getModelAnswer(@Body() data: GetAiModelAnswer) {
        return this.chatService.getModelAnswer(data);
    }

    @Get("/model")
    listModels(){
        return this.chatService.listModels();
    }

    @Post("/fast-answers")
    getFastAnswer(@Body() data: GetModelFastAnswer) {
        return this.chatService.getFastAnswer(data);
    }
}
