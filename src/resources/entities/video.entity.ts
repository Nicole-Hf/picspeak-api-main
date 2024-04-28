import { Message } from "src/message/entities/message.entity";
import { Resource } from "src/resources/entities/resource.entity";
import { Column, Entity, ManyToOne } from "typeorm";

@Entity()
export class Video extends Resource {
    @Column({ primary: true, generated: true})
    id: number;

    @Column({ nullable: false, name: 'video_url'})
    url: string;

    @Column({ nullable: false, name: 'video_path'})
    pathDevice: string;

    @ManyToOne(() => Message, (message) => message.image)
    message: Message
}