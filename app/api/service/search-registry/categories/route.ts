import { NextResponse } from 'next/server';

const REGISTRY_API_URL = process.env.NEXT_PUBLIC_SEARCH_REGISTRY_API_URL || 'https://registry.plugged.in/api';

export async function GET() {
  try {
    const response = await fetch(`${REGISTRY_API_URL}/categories`, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    // If the response has a categories property, return just the array
    if (Array.isArray(data)) {
      return NextResponse.json(data);
    } else if (data.categories && Array.isArray(data.categories)) {
      return NextResponse.json(data.categories);
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return fallback categories
    return NextResponse.json([
      'Aggregators',
      'Art & Culture',
      'Browser Automation',
      'Cloud Platforms',
      'Code Execution',
      'Coding Agents',
      'Command Line',
      'Communication',
      'Customer Data Platforms',
      'Databases',
      'Data Platforms',
      'Developer Tools',
      'File Systems',
      'Finance & Fintech',
      'Gaming',
      'Knowledge & Memory',
      'Marketing',
      'Monitoring',
      'Multimedia Process',
      'Search & Data Extraction',
      'Security',
      'Social Media',
      'Sports',
      'Support & Service Management',
      'Translation Services',
      'Text-to-Speech',
      'Travel & Transportation',
      'Version Control',
      'Other Tools and Integrations',
      'Miscellaneous'
    ]);
  }
}