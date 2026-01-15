export class CreateDraftDto {
  segmentId: string;
  condition: 'OPTIMAL' | 'MEDIUM' | 'SUFFICIENT' | 'MAINTENANCE';
  notes?: string;
}
