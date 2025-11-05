import { IsString, IsNotEmpty, MinLength, IsOptional, ValidateIf, IsBoolean, IsObject } from 'class-validator';

export class CreateScriptVersionDto {
  // Quando autoGenerate for false (padrão), content é obrigatório
  @ValidateIf((o) => !o.autoGenerate)
  @IsString()
  @IsNotEmpty({ message: 'O conteúdo do roteiro é obrigatório' })
  @MinLength(10, { message: 'O conteúdo deve ter no mínimo 10 caracteres' })
  content?: string;

  // Se true, o backend deve gerar o conteúdo automaticamente usando a IA
  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;

  // Descrição/instrução que orienta a geração automática (obrigatório quando autoGenerate=true)
  @ValidateIf((o) => o.autoGenerate)
  @IsString()
  @IsNotEmpty({ message: 'A descrição para geração automática é obrigatória' })
  description?: string;

  // Opções adicionais para a geração (audiência, tom, objetivo, temas, tempos)
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

