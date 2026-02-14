import { IsNotEmpty, IsString, Length } from 'class-validator';

export class JoinFamilyDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code!: string;
}
