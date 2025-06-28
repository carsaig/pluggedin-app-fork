/**
 * Dynamic categories will be fetched from the API
 */
export let mcpServerCategories: string[] = [];

/**
 * Set the available categories (called after fetching from API)
 */
export function setCategories(categories: string[]) {
  mcpServerCategories = categories;
}

/**
 * Get the icon name for a category (for use with Lucide icons)
 * 
 * @param category - The category to get an icon for
 * @returns Icon name from Lucide icons
 */
export function getCategoryIcon(category: string): string {
  // Map category names to icons
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('ai') || categoryLower.includes('llm')) return 'Brain';
  if (categoryLower.includes('aggregator')) return 'Layers';
  if (categoryLower.includes('art') || categoryLower.includes('culture')) return 'Palette';
  if (categoryLower.includes('browser') || categoryLower.includes('automation')) return 'Globe';
  if (categoryLower.includes('cloud')) return 'Cloud';
  if (categoryLower.includes('code') || categoryLower.includes('execution')) return 'Code';
  if (categoryLower.includes('coding') || categoryLower.includes('agent')) return 'Bot';
  if (categoryLower.includes('command') || categoryLower.includes('line')) return 'Terminal';
  if (categoryLower.includes('communication') || categoryLower.includes('chat')) return 'MessageSquare';
  if (categoryLower.includes('customer')) return 'UserCheck';
  if (categoryLower.includes('database') || categoryLower.includes('data')) return 'Database';
  if (categoryLower.includes('deliver')) return 'Package';
  if (categoryLower.includes('developer') || categoryLower.includes('tool')) return 'Wrench';
  if (categoryLower.includes('embedded')) return 'Cpu';
  if (categoryLower.includes('file')) return 'FolderOpen';
  if (categoryLower.includes('finance') || categoryLower.includes('fintech')) return 'DollarSign';
  if (categoryLower.includes('gaming') || categoryLower.includes('game')) return 'Gamepad';
  if (categoryLower.includes('knowledge') || categoryLower.includes('memory')) return 'BookOpen';
  if (categoryLower.includes('location')) return 'MapPin';
  if (categoryLower.includes('marketing')) return 'TrendingUp';
  if (categoryLower.includes('monitor')) return 'Activity';
  if (categoryLower.includes('multimedia')) return 'Film';
  if (categoryLower.includes('search') || categoryLower.includes('extraction')) return 'Search';
  if (categoryLower.includes('security')) return 'Shield';
  if (categoryLower.includes('social')) return 'Share2';
  if (categoryLower.includes('sport')) return 'Trophy';
  if (categoryLower.includes('support') || categoryLower.includes('service')) return 'HelpCircle';
  if (categoryLower.includes('translation')) return 'Languages';
  if (categoryLower.includes('text-to-speech') || categoryLower.includes('speech')) return 'Mic';
  if (categoryLower.includes('travel') || categoryLower.includes('transport')) return 'Plane';
  if (categoryLower.includes('version') || categoryLower.includes('control')) return 'GitBranch';
  if (categoryLower.includes('other') || categoryLower.includes('misc')) return 'Grid3x3';
  
  // Default icon
  return 'CircleDot';
}