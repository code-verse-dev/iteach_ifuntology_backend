import { PartialType } from '@nestjs/mapped-types';
import { CreateVidLibraryDto } from './create-vid-library.dto';

export class UpdateVidLibraryDto extends PartialType(CreateVidLibraryDto) {}
