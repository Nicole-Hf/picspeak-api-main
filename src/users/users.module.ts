import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { IndividualUser } from './entities/individual-user.entity';
import { InterestUser } from 'src/configuration/entities/interest_user.entity';
import { LanguageUser } from 'src/configuration/entities/language_user.entity';
import { Contact } from 'src/contact/entities/contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, IndividualUser,InterestUser,LanguageUser, Contact])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService]
})

export class UsersModule { }
