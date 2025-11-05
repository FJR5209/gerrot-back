import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do cliente é obrigatório' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  name!: string;
}

