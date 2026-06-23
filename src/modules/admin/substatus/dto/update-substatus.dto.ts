import { PartialType } from '@nestjs/mapped-types';
import { CreateSubstatusDto } from './create-substatus.dto';

export class UpdateSubstatusDto extends PartialType(CreateSubstatusDto) {}
