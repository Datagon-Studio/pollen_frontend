import { memberRepository, Member, CreateMemberInput, UpdateMemberInput } from './member.repository.js';

export const memberService = {
  async getMember(id: string): Promise<Member | null> {
    return memberRepository.findById(id);
  },

  async getMembersByAccount(accountId: string): Promise<Member[]> {
    return memberRepository.findByAccountId(accountId);
  },

  async createMember(input: CreateMemberInput): Promise<Member | null> {
    // Validate required fields
    if (!input.first_name?.trim()) {
      throw new Error('First name is required');
    }
    if (!input.last_name?.trim()) {
      throw new Error('Last name is required');
    }
    if (!input.phone?.trim()) {
      throw new Error('Phone number is required');
    }
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    // Check for duplicate phone
    const existingPhone = await memberRepository.findByPhone(input.phone, input.account_id);
    if (existingPhone) {
      throw new Error('A member with this phone number already exists');
    }

    // Check for duplicate email if provided
    if (input.email) {
      const existingEmail = await memberRepository.findByEmail(input.email, input.account_id);
      if (existingEmail) {
        throw new Error('A member with this email already exists');
      }
    }

    // Set defaults
    const memberData: CreateMemberInput = {
      ...input,
      phone_verified: input.phone_verified ?? false,
      email_verified: input.email_verified ?? false,
    };

    return memberRepository.create(memberData);
  },

  async updateMember(id: string, input: UpdateMemberInput): Promise<Member | null> {
    const existing = await memberRepository.findById(id);
    if (!existing) {
      throw new Error('Member not found');
    }

    // Check for duplicate phone if changing
    if (input.phone && input.phone !== existing.phone) {
      const existingPhone = await memberRepository.findByPhone(input.phone, existing.account_id);
      if (existingPhone) {
        throw new Error('A member with this phone number already exists');
      }
    }

    // Check for duplicate email if changing
    if (input.email && input.email !== existing.email) {
      const existingEmail = await memberRepository.findByEmail(input.email, existing.account_id);
      if (existingEmail) {
        throw new Error('A member with this email already exists');
      }
    }

    return memberRepository.update(id, input);
  },

  async deleteMember(id: string): Promise<boolean> {
    const existing = await memberRepository.findById(id);
    if (!existing) {
      throw new Error('Member not found');
    }
    return memberRepository.delete(id);
  },

  async verifyPhone(id: string): Promise<Member | null> {
    return memberRepository.update(id, { phone_verified: true });
  },

  async verifyEmail(id: string): Promise<Member | null> {
    return memberRepository.update(id, { email_verified: true });
  },

  async getMemberStats(accountId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [members, activeCount, inactiveCount] = await Promise.all([
      memberRepository.findByAccountId(accountId),
      memberRepository.getActiveCount(accountId),
      memberRepository.getInactiveCount(accountId),
    ]);

    return {
      total: members.length,
      active: activeCount,
      inactive: inactiveCount,
    };
  },

  isMemberActive(member: Member): boolean {
    return member.phone_verified || member.email_verified;
  },
};

