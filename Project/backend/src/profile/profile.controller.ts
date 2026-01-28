import { Controller, Get, Req, UseGuards,Query } from "@nestjs/common"
import { ProfileService } from "./profile.service"
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard"
import { ProfileResponseDto } from "./dto/profile.dto"


@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get()
  async getProfile(@Req() req: any): Promise<ProfileResponseDto> {
    const userId = req.user.userId
    return this.profileService.getProfileSummary(userId)
  }
}
