import { NextResponse } from 'next/server';
import { neonClient, NeonDonor, NeonDonation, NeonCampaign, NeonMembership } from '@/lib/services/neon';
import { requireRole } from '@/lib/auth-server';
import { handleApiError } from '@/lib/api-error';

// Demo data - fallback when API is not configured or fails
const demoDonors: NeonDonor[] = [
  { id: '1', firstName: 'Robert', lastName: 'Anderson', email: 'robert.anderson@example.com', totalDonations: 15000, donationCount: 12, lastDonationDate: '2025-12-15', membershipStatus: 'active', createdAt: '2020-03-15' },
  { id: '2', firstName: 'Susan', lastName: 'Williams', email: 'susan.williams@example.com', totalDonations: 8500, donationCount: 8, lastDonationDate: '2025-12-20', membershipStatus: 'active', createdAt: '2021-06-10' },
  { id: '3', firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@example.com', totalDonations: 5200, donationCount: 5, lastDonationDate: '2025-11-30', membershipStatus: 'none', createdAt: '2022-01-20' },
  { id: '4', firstName: 'Jennifer', lastName: 'Davis', email: 'jennifer.davis@example.com', totalDonations: 3800, donationCount: 4, lastDonationDate: '2025-12-10', membershipStatus: 'expired', createdAt: '2021-09-05' },
  { id: '5', firstName: 'David', lastName: 'Miller', email: 'david.miller@example.com', totalDonations: 2500, donationCount: 3, lastDonationDate: '2025-12-22', membershipStatus: 'active', createdAt: '2023-04-12' },
];

const demoDonations: NeonDonation[] = [
  { id: '1', donorId: '5', donorName: 'David Miller', amount: 500, date: '2025-12-22', campaign: 'Year-End Giving', fund: 'General Fund', paymentMethod: 'credit_card', status: 'completed', recurring: false },
  { id: '2', donorId: '2', donorName: 'Susan Williams', amount: 1000, date: '2025-12-20', campaign: 'Year-End Giving', fund: 'Housing Fund', paymentMethod: 'ach', status: 'completed', recurring: true },
  { id: '3', donorId: '1', donorName: 'Robert Anderson', amount: 2500, date: '2025-12-15', campaign: 'Capital Campaign', fund: 'Building Fund', paymentMethod: 'check', status: 'completed', recurring: false },
  { id: '4', donorId: '4', donorName: 'Jennifer Davis', amount: 250, date: '2025-12-10', campaign: 'Year-End Giving', fund: 'General Fund', paymentMethod: 'credit_card', status: 'completed', recurring: false },
  { id: '5', donorId: '3', donorName: 'Michael Brown', amount: 750, date: '2025-11-30', campaign: 'Education Initiative', fund: 'Education Fund', paymentMethod: 'credit_card', status: 'completed', recurring: false },
];

const demoCampaigns: NeonCampaign[] = [
  { id: '1', name: 'Year-End Giving 2025', goal: 50000, raised: 32500, donorCount: 45, startDate: '2025-11-01', endDate: '2025-12-31', status: 'active' },
  { id: '2', name: 'Capital Campaign', goal: 250000, raised: 125000, donorCount: 28, startDate: '2025-01-01', endDate: '2026-12-31', status: 'active' },
  { id: '3', name: 'Education Initiative', goal: 25000, raised: 18500, donorCount: 35, startDate: '2025-09-01', endDate: '2025-12-15', status: 'completed' },
];

const demoMemberships: NeonMembership[] = [
  { id: '1', donorId: '1', donorName: 'Robert Anderson', level: 'Patron', startDate: '2025-01-01', endDate: '2025-12-31', status: 'active', amount: 500, autoRenew: true },
  { id: '2', donorId: '2', donorName: 'Susan Williams', level: 'Supporter', startDate: '2025-03-15', endDate: '2026-03-14', status: 'active', amount: 250, autoRenew: true },
  { id: '3', donorId: '5', donorName: 'David Miller', level: 'Friend', startDate: '2025-06-01', endDate: '2026-05-31', status: 'active', amount: 100, autoRenew: false },
  { id: '4', donorId: '4', donorName: 'Jennifer Davis', level: 'Supporter', startDate: '2024-06-01', endDate: '2025-05-31', status: 'expired', amount: 250, autoRenew: false },
];

// Helper to check if Neon is configured
function isNeonConfigured(): boolean {
  return !!(process.env.NEON_API_KEY && process.env.NEON_ORG_ID);
}

// Transform Neon API donor to our format
function transformDonor(donor: NeonDonor) {
  return {
    id: donor.id,
    firstName: donor.firstName,
    lastName: donor.lastName,
    email: donor.email,
    phone: donor.phone,
    totalDonations: donor.totalDonations,
    donationCount: donor.donationCount,
    lastDonationDate: donor.lastDonationDate,
    membershipStatus: donor.membershipStatus,
    createdAt: donor.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    // Require admin, coordinator, or board_member role
    await requireRole(['admin', 'coordinator', 'board_member']);

    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'donations';

    const hasNeonCredentials = isNeonConfigured();
    // Try to fetch from real API if configured
    if (hasNeonCredentials) {
      try {
        switch (dataType) {
          case 'donors': {
            const response = await neonClient.getDonors();
            return NextResponse.json({
              success: true,
              data: response.data,
              isDemo: false,
            });
          }

          case 'donations': {
            const response = await neonClient.getDonations();
            return NextResponse.json({
              success: true,
              data: response.data,
              isDemo: false,
            });
          }

          case 'campaigns': {
            const response = await neonClient.getCampaigns();
            return NextResponse.json({
              success: true,
              data: response.data,
              isDemo: false,
            });
          }

          case 'memberships': {
            const response = await neonClient.getMemberships();
            return NextResponse.json({
              success: true,
              data: response.data,
              isDemo: false,
            });
          }

          case 'dashboard': {
            const dashboardData = await neonClient.getDashboardSummary();
            return NextResponse.json({
              success: true,
              data: dashboardData,
              isDemo: false,
            });
          }

          default:
            return NextResponse.json(
              { success: false, error: 'Invalid data type' },
              { status: 400 }
            );
        }
      } catch (apiError) {
        console.error('Neon API call failed, falling back to demo data:', apiError);
        // Fall through to demo data
      }
    }

    // Return demo data if API not configured or failed
    switch (dataType) {
      case 'donors':
        return NextResponse.json({
          success: true,
          data: demoDonors,
          isDemo: true,
        });

      case 'donations':
        return NextResponse.json({
          success: true,
          data: demoDonations,
          isDemo: true,
        });

      case 'campaigns':
        return NextResponse.json({
          success: true,
          data: demoCampaigns,
          isDemo: true,
        });

      case 'memberships':
        return NextResponse.json({
          success: true,
          data: demoMemberships,
          isDemo: true,
        });

      case 'dashboard':
        // Calculate demo dashboard data
        const totalDonations = demoDonations.reduce((sum, d) => sum + d.amount, 0);
        const activeCampaigns = demoCampaigns.filter(c => c.status === 'active');
        const activeMembers = demoMemberships.filter(m => m.status === 'active');
        const topDonors = [...demoDonors].sort((a, b) => b.totalDonations - a.totalDonations).slice(0, 5);

        return NextResponse.json({
          success: true,
          data: {
            totalDonations,
            totalDonors: demoDonors.length,
            activeCampaigns: activeCampaigns.length,
            activeMembers: activeMembers.length,
            recentDonations: demoDonations,
            topDonors,
            campaigns: demoCampaigns,
          },
          isDemo: true,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid data type' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
