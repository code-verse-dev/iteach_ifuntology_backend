import { Module } from '@nestjs/common';
import { ModelsModule } from 'src/models/models.module';
import { PracticalCreditSheetController } from './practical-credit-sheet.controller';
import { PracticalCreditSheetService } from './practical-credit-sheet.service';

@Module({
  imports: [ModelsModule],
  controllers: [PracticalCreditSheetController],
  providers: [PracticalCreditSheetService],
  exports: [PracticalCreditSheetService],
})
export class PracticalCreditSheetModule {}
