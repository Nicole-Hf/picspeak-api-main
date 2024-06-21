import { IsNotEmpty, IsString } from "class-validator";

export class GetModelFastAnswer{
    
    @IsString()
    @IsNotEmpty()
    message:string
}