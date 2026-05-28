import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: 'Gyms', slug: 'gyms', description: 'Fitness centers and gyms' },
  { name: 'Doctors', slug: 'doctors', description: 'Medical practices and clinics' },
  { name: 'Restaurants', slug: 'restaurants', description: 'Restaurants and food establishments' },
  { name: 'Libraries', slug: 'libraries', description: 'Public and private libraries' },
  { name: 'Coaching Centres', slug: 'coaching-centres', description: 'Educational coaching centers' },
]

const sampleLeads = [
  {
    businessName: 'FitLife Gym',
    ownerName: 'John Smith',
    phone: '9876543210',
    city: 'Mumbai',
    googleProfileUrl: 'https://g.page/fitlife-gym',
    googleReviewCount: 128,
    status: 'INTERESTED',
    isCalled: true,
    notes: 'Interested in our marketing package',
  },
  {
    businessName: 'Power Zone Fitness',
    ownerName: 'Raj Patel',
    phone: '9876543211',
    city: 'Delhi',
    googleProfileUrl: 'https://g.page/power-zone',
    googleReviewCount: 85,
    status: 'FOLLOW_UP',
    isCalled: true,
    notes: 'Call back next week',
  },
  {
    businessName: 'Iron Paradise',
    ownerName: 'Mike Johnson',
    phone: '9876543212',
    city: 'Bangalore',
    googleProfileUrl: 'https://g.page/iron-paradise',
    googleReviewCount: 203,
    status: 'NOT_CONTACTED',
    isCalled: false,
    notes: '',
  },
  {
    businessName: 'Dr. Sarah Clinic',
    ownerName: 'Dr. Sarah Williams',
    phone: '9876543213',
    city: 'Mumbai',
    googleProfileUrl: 'https://g.page/dr-sarah',
    googleReviewCount: 312,
    status: 'CONVERTED',
    isCalled: true,
    notes: 'Signed up for premium plan',
  },
  {
    businessName: 'Health First Medical',
    ownerName: 'Dr. Amit Sharma',
    phone: '9876543214',
    city: 'Delhi',
    googleProfileUrl: 'https://g.page/health-first',
    googleReviewCount: 156,
    status: 'CALLED',
    isCalled: true,
    notes: 'Will discuss with partners',
  },
  {
    businessName: 'Taste of India',
    ownerName: 'Priya Gupta',
    phone: '9876543215',
    city: 'Bangalore',
    googleProfileUrl: 'https://g.page/taste-india',
    googleReviewCount: 445,
    status: 'NOT_CONTACTED',
    isCalled: false,
    notes: '',
  },
  {
    businessName: 'Spice Garden Restaurant',
    ownerName: 'Kumar Reddy',
    phone: '9876543216',
    city: 'Hyderabad',
    googleProfileUrl: 'https://g.page/spice-garden',
    googleReviewCount: 289,
    status: 'INTERESTED',
    isCalled: true,
    notes: 'Wants demo next Monday',
  },
  {
    businessName: 'City Central Library',
    ownerName: 'Anita Desai',
    phone: '9876543217',
    city: 'Pune',
    googleProfileUrl: 'https://g.page/city-library',
    googleReviewCount: 78,
    status: 'NOT_CONTACTED',
    isCalled: false,
    notes: '',
  },
  {
    businessName: 'Excel Coaching Centre',
    ownerName: 'Ravi Kumar',
    phone: '9876543218',
    city: 'Chennai',
    googleProfileUrl: 'https://g.page/excel-coaching',
    googleReviewCount: 167,
    status: 'FOLLOW_UP',
    isCalled: true,
    notes: 'Send pricing details via email',
  },
  {
    businessName: 'Smart Study Academy',
    ownerName: 'Neha Singh',
    phone: '9876543219',
    city: 'Kolkata',
    googleProfileUrl: 'https://g.page/smart-study',
    googleReviewCount: 94,
    status: 'REJECTED',
    isCalled: true,
    notes: 'Not interested at this time',
  },
]

async function main() {
  console.log('Seeding database...')

  // Create categories
  for (const cat of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: cat.slug },
    })
    if (!existing) {
      await prisma.category.create({
        data: cat,
      })
      console.log(`Created category: ${cat.name}`)
    }
  }

  // Create sample leads
  const allCategories = await prisma.category.findMany()
  
  for (const lead of sampleLeads) {
    // Assign to appropriate category
    let categorySlug = 'gyms'
    if (lead.businessName.includes('Dr.') || lead.businessName.includes('Medical')) {
      categorySlug = 'doctors'
    } else if (lead.businessName.includes('Restaurant') || lead.businessName.includes('Taste')) {
      categorySlug = 'restaurants'
    } else if (lead.businessName.includes('Library')) {
      categorySlug = 'libraries'
    } else if (lead.businessName.includes('Coaching') || lead.businessName.includes('Academy') || lead.businessName.includes('Study')) {
      categorySlug = 'coaching-centres'
    }

    const category = allCategories.find(c => c.slug === categorySlug)
    if (!category) continue

    const existing = await prisma.lead.findFirst({
      where: { businessName: lead.businessName },
    })

    if (!existing) {
      await prisma.lead.create({
        data: {
          categoryId: category.id,
          businessName: lead.businessName,
          ownerName: lead.ownerName,
          phone: lead.phone,
          city: lead.city,
          googleProfileUrl: lead.googleProfileUrl,
          googleReviewCount: lead.googleReviewCount,
          status: lead.status as any,
          notes: lead.notes,
          isCalled: lead.isCalled,
        },
      })
      console.log(`Created lead: ${lead.businessName}`)
    }
  }

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
