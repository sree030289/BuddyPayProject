import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ViewStyle, TextStyle } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress?: () => void;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showAlert?: boolean;
  alertMessage?: string;
}

/**
 * ActionButton component with icon
 * 
 * @param icon - Ionicons icon name
 * @param label - Button text
 * @param onPress - Press handler
 * @param color - Primary color
 * @param style - Additional container styles
 * @param textStyle - Additional text styles
 * @param showAlert - Whether to show "coming soon" alert
 * @param alertMessage - Custom alert message
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onPress,
  color = '#0A6EFF',
  style,
  textStyle,
  showAlert = true,
  alertMessage = "Coming up in future updates!"
}) => {
  
  const handlePress = () => {
    if (showAlert) {
      Alert.alert("Coming soon!", alertMessage);
    }
    
    if (onPress) {
      onPress();
    }
  };
  
  return (
    <TouchableOpacity 
      style={[styles.button, { borderColor: color }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Icon name={icon as any} size={18} color={color} style={styles.icon} />
      <Text style={[styles.label, { color }, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontWeight: '500',
    fontSize: 14,
  }
});

export default ActionButton;