import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

// Define group types and their corresponding icons
export const GROUP_TYPES: Record<string, string> = {
  "flight trip": "airplane-outline",
  "flight": "airplane-outline", 
  "beach trip": "umbrella-outline",
  "beach": "umbrella-outline",
  "flatmate": "home-outline",
  "flat": "home-outline",
  "apartment": "home-outline",
  "gettogether": "people-outline",
  "get together": "people-outline",
  "gathering": "people-outline",
  "party": "wine-outline",
  "celebration": "wine-outline"
};

// Define group type colors
export const GROUP_COLORS: Record<string, string> = {
  "flight trip": "#4FC3F7", // Light blue
  "flight": "#4FC3F7",
  "beach trip": "#FFB74D", // Orange
  "beach": "#FFB74D",
  "flatmate": "#81C784", // Green
  "flat": "#81C784",
  "apartment": "#81C784",
  "gettogether": "#9575CD", // Purple
  "get together": "#9575CD",
  "gathering": "#9575CD",
  "party": "#F06292", // Pink
  "celebration": "#F06292"
};

// Helper function to get the icon for a group type
export const getGroupIcon = (groupType: string = ""): string => {
  const type = groupType.toLowerCase();
  
  for (const [key, value] of Object.entries(GROUP_TYPES)) {
    if (type.includes(key)) {
      return value;
    }
  }
  
  return "people-outline"; // Default icon
};

// Helper function to get color for a group type
export const getGroupColor = (groupType: string = ""): string => {
  const type = groupType.toLowerCase();
  
  for (const [key, value] of Object.entries(GROUP_COLORS)) {
    if (type.includes(key)) {
      return value;
    }
  }
  
  return "#9E9E9E"; // Default color (gray)
};

interface GroupIconProps {
  type: string;
  size?: number;
  hasImage?: boolean;
  imageUrl?: string;
}

// Component to render a group icon based on type
export const GroupIcon: React.FC<GroupIconProps> = ({ 
  type, 
  size = 24, 
  hasImage = false, 
  imageUrl = "" 
}) => {
  const iconName = getGroupIcon(type);
  const iconColor = getGroupColor(type);
  
  return (
    <View style={[
      styles.iconContainer, 
      { width: size * 2, height: size * 2, borderRadius: size }
    ]}>
      <Icon name={iconName as any} size={size} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default {
  getGroupIcon,
  getGroupColor,
  GroupIcon
};