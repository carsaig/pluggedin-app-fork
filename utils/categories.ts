import { McpServerCategory } from '@/types/search';

/**
 * Get the icon name for a category (for use with Lucide icons)
 * 
 * @param category - The category to get an icon for
 * @returns Icon name from Lucide icons
 */
export function getCategoryIcon(category: McpServerCategory): string {
  switch (category) {
    case McpServerCategory.AI:
      return 'Brain';
    case McpServerCategory.AUTOMATION:
      return 'Zap';
    case McpServerCategory.BUSINESS:
      return 'Briefcase';
    case McpServerCategory.CHAT:
      return 'MessageSquare';
    case McpServerCategory.CODE:
      return 'Code';
    case McpServerCategory.COMMUNITY:
      return 'Users';
    case McpServerCategory.CRYPTO:
      return 'Bitcoin';
    case McpServerCategory.DATA:
      return 'Database';
    case McpServerCategory.DATING:
      return 'Heart';
    case McpServerCategory.DESIGN:
      return 'Palette';
    case McpServerCategory.DEVELOPER_TOOLS:
      return 'Wrench';
    case McpServerCategory.EDUCATION:
      return 'GraduationCap';
    case McpServerCategory.EMAIL:
      return 'Mail';
    case McpServerCategory.ENTERTAINMENT:
      return 'Gamepad2';
    case McpServerCategory.EVENTS:
      return 'Calendar';
    case McpServerCategory.FAMILY:
      return 'Users2';
    case McpServerCategory.FILE_MANAGEMENT:
      return 'FolderOpen';
    case McpServerCategory.FINANCE:
      return 'DollarSign';
    case McpServerCategory.FITNESS:
      return 'Activity';
    case McpServerCategory.FOOD:
      return 'UtensilsCrossed';
    case McpServerCategory.FUN:
      return 'Smile';
    case McpServerCategory.GAMING:
      return 'Gamepad';
    case McpServerCategory.HEALTH:
      return 'HeartPulse';
    case McpServerCategory.HOME:
      return 'Home';
    case McpServerCategory.IMAGE:
      return 'Image';
    case McpServerCategory.INTERNET_OF_THINGS:
      return 'Cpu';
    case McpServerCategory.JOBS:
      return 'Briefcase';
    case McpServerCategory.LANGUAGE:
      return 'Languages';
    case McpServerCategory.LEGAL:
      return 'Scale';
    case McpServerCategory.LIFESTYLE:
      return 'Coffee';
    case McpServerCategory.MARKETING:
      return 'TrendingUp';
    case McpServerCategory.MATH:
      return 'Calculator';
    case McpServerCategory.MUSIC:
      return 'Music';
    case McpServerCategory.NEWS:
      return 'Newspaper';
    case McpServerCategory.NOTES:
      return 'NotebookPen';
    case McpServerCategory.PHOTOS:
      return 'Camera';
    case McpServerCategory.PRODUCTIVITY:
      return 'CheckSquare';
    case McpServerCategory.PROJECT_MANAGEMENT:
      return 'KanbanSquare';
    case McpServerCategory.RELIGION:
      return 'BookOpen';
    case McpServerCategory.SCIENCE:
      return 'Microscope';
    case McpServerCategory.SEARCH:
      return 'Search';
    case McpServerCategory.SECURITY:
      return 'Shield';
    case McpServerCategory.SHOPPING:
      return 'ShoppingCart';
    case McpServerCategory.SOCIAL:
      return 'Share2';
    case McpServerCategory.SPORTS:
      return 'Trophy';
    case McpServerCategory.TRAVEL:
      return 'Plane';
    case McpServerCategory.UTILITIES:
      return 'Tool';
    case McpServerCategory.VIDEO:
      return 'Video';
    case McpServerCategory.WEATHER:
      return 'Cloud';
    default:
      return 'CircleDot';
  }
}