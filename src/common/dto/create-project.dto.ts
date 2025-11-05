import { IsString, IsNotEmpty, IsEnum, MinLength, MaxLength, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { ScriptType } from '../../modules/4-projects/entities/project.entity';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'O título do projeto é obrigatório' })
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres' })
  @MaxLength(200, { message: 'O título deve ter no máximo 200 caracteres' })
  title!: string;

  @IsEnum(ScriptType, { message: 'Tipo de roteiro inválido' })
  scriptType!: ScriptType;

  @IsString()
  @IsNotEmpty({ message: 'O ID do cliente é obrigatório' })
  clientId!: string;

  // Campos de Agenda (opcionais)

  @IsOptional()
  @IsDateString({}, { message: 'Data de gravação inválida' })
  recordingDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Prazo de entrega inválido' })
  deliveryDeadline?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Duração estimada deve ser um número' })
  @Min(1, { message: 'Duração estimada deve ser maior que zero' })
  estimatedDuration?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Local deve ter no máximo 200 caracteres' })
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Observações devem ter no máximo 1000 caracteres' })
  notes?: string;
}

