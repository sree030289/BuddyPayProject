// Add this to your components folder (e.g., SimpleSplitOptions.tsx)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Platform,
  Keyboard,
  InputAccessoryView,
  Button,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatCurrency';

const { width } = Dimensions.get('window');
// Generate a unique ID for keyboard input accessory view
const INPUT_ACCESSORY_ID = 'splitOptionsKeyboardDone';

interface SplitMember {
  uid: string;
  name: string;
  isSelected: boolean;
}

interface SimpleSplitOptionsProps {
  totalAmount: number;
  members: SplitMember[];
  selectedMembers: Record<string, boolean>;
  onToggleMember: (uid: string) => void;
  splitMethod: string;
  onSplitMethodChange: (method: string) => void;
  customSplits: any[];
  onCustomSplitsChange: (splits: any[]) => void;
  onApplySplit: () => void;
}

const SimpleSplitOptions = ({
  totalAmount,
  members,
  selectedMembers,
  onToggleMember,
  splitMethod,
  onSplitMethodChange,
  customSplits,
  onCustomSplitsChange,
  onApplySplit
}: SimpleSplitOptionsProps) => {
  const [recalculating, setRecalculating] = useState(false);

  // Initialize customSplits if needed
  useEffect(() => {
    if (splitMethod !== 'equal' && customSplits.length === 0) {
      const initialSplits = members
        .filter(m => selectedMembers[m.uid])
        .map(member => {
          if (splitMethod === 'percentage') {
            // Equal percentages
            const count = members.filter(m => selectedMembers[m.uid]).length;
            const percentage = count > 0 ? (100 / count).toFixed(2) : '0';
            return { memberId: member.uid, value: percentage };
          } else if (splitMethod === 'shares') {
            // 1 share each initially
            return { memberId: member.uid, value: '1' };
          } else {
            // Equal amounts
            const count = members.filter(m => selectedMembers[m.uid]).length;
            const amount = count > 0 ? (totalAmount / count).toFixed(2) : '0';
            return { memberId: member.uid, value: amount };
          }
        });
      
      onCustomSplitsChange(initialSplits);
    }
  }, [splitMethod, members, selectedMembers]);

  // Calculate split information
  const calculateSplitInfo = () => {
    const selectedCount = Object.values(selectedMembers).filter(Boolean).length;
    
    if (splitMethod === 'equal') {
      return selectedCount > 0 
        ? `Each person pays ${formatCurrency(totalAmount / selectedCount)}`
        : 'Select people to split with';
    } else if (splitMethod === 'percentage') {
      const totalPercentage = customSplits.reduce(
        (sum, split) => sum + parseFloat(split.value || '0'), 
        0
      );
      return `Total: ${totalPercentage.toFixed(2)}% ${totalPercentage === 100 ? '✓' : '(should be 100%)'}`;
    } else if (splitMethod === 'shares') {
      const totalShares = customSplits.reduce(
        (sum, split) => sum + parseInt(split.value || '1'), 
        0
      );
      return `Total: ${totalShares} shares`;
    } else {
      const totalSplit = customSplits.reduce(
        (sum, split) => sum + parseFloat(split.value || '0'), 
        0
      );
      return `Total: ${formatCurrency(totalSplit)} ${Math.abs(totalSplit - totalAmount) < 0.01 ? '✓' : '≠ ' + formatCurrency(totalAmount)}`;
    }
  };

  // Update split value for a member
  const updateSplitValue = (memberId: string, value: string) => {
    const updatedSplits = customSplits.map(split => {
      if (split.memberId === memberId) {
        return { ...split, value };
      }
      return split;
    });
    
    onCustomSplitsChange(updatedSplits);
    
    // Trigger recalculation animation
    setRecalculating(true);
    setTimeout(() => setRecalculating(false), 300);
  };

  // Update shares for a member
  const adjustShares = (memberId: string, increment: boolean) => {
    if (splitMethod !== 'shares') return;
    
    const updatedSplits = customSplits.map(split => {
      if (split.memberId === memberId) {
        const currentShares = parseInt(split.value) || 1;
        const newShares = increment 
          ? currentShares + 1 
          : Math.max(1, currentShares - 1);
        
        return { ...split, value: newShares.toString() };
      }
      return split;
    });
    
    onCustomSplitsChange(updatedSplits);
    
    // Trigger recalculation animation
    setRecalculating(true);
    setTimeout(() => setRecalculating(false), 300);
  };

  // Get the amount/percentage/shares for a member
  const getMemberValue = (memberId: string) => {
    if (splitMethod === 'equal') {
      const selectedCount = Object.values(selectedMembers).filter(Boolean).length;
      return selectedCount > 0 ? formatCurrency(totalAmount / selectedCount) : '0.00';
    }
    
    const split = customSplits.find(split => split.memberId === memberId);
    if (!split) return splitMethod === 'percentage' ? '0.00' : formatCurrency(0);
    
    if (splitMethod === 'percentage') {
      return `${parseFloat(split.value || '0').toFixed(2)}%`;
    } else if (splitMethod === 'shares') {
      // Calculate the actual amount based on shares
      const totalShares = customSplits.reduce(
        (sum, s) => sum + parseInt(s.value || '1'), 
        0
      );
      
      if (totalShares === 0) return formatCurrency(0);
      
      const shares = parseInt(split.value || '1');
      const amount = (shares / totalShares) * totalAmount;
      return formatCurrency(amount);
    } else {
      return formatCurrency(parseFloat(split.value || '0'));
    }
  };

  // Get the calculated amount for display in shares mode
  const getSharesAmount = (memberId: string) => {
    if (splitMethod !== 'shares') return '';
    
    const totalShares = customSplits.reduce(
      (sum, split) => sum + parseInt(split.value || '1'), 
      0
    );
    
    if (totalShares === 0) return formatCurrency(0);
    
    const split = customSplits.find(split => split.memberId === memberId);
    if (!split) return formatCurrency(0);
    
    const shares = parseInt(split.value || '1');
    const amount = (shares / totalShares) * totalAmount;
    return formatCurrency(amount);
  };

  // Render the split value input based on split method
  const renderSplitValue = (member: SplitMember) => {
    if (!selectedMembers[member.uid]) {
      return <Text style={styles.disabledText}>Not included</Text>;
    }
    
    if (splitMethod === 'equal') {
      return (
        <Text style={styles.amountText}>₹{getMemberValue(member.uid)}</Text>
      );
    } else if (splitMethod === 'percentage') {
      const split = customSplits.find(split => split.memberId === member.uid);
      return (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={split?.value || '0'}
            onChangeText={(value) => updateSplitValue(member.uid, value)}
          />
          <Text style={styles.inputSuffix}>%</Text>
        </View>
      );
    } else if (splitMethod === 'shares') {
      const split = customSplits.find(split => split.memberId === member.uid);
      return (
        <View style={styles.sharesContainer}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => adjustShares(member.uid, false)}
          >
            <Ionicons name="remove" size={16} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.sharesText}>{split?.value || '1'}</Text>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => adjustShares(member.uid, true)}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.amountText}>₹{getSharesAmount(member.uid)}</Text>
        </View>
      );
    } else {
      // Amount split
      const split = customSplits.find(split => split.memberId === member.uid);
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.inputPrefix}>₹</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={split?.value || '0'}
            onChangeText={(value) => updateSplitValue(member.uid, value)}
          />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Split methods tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, splitMethod === 'equal' && styles.activeTab]} 
          onPress={() => onSplitMethodChange('equal')}
        >
          <Ionicons 
            name="people" 
            size={22} 
            color={splitMethod === 'equal' ? '#8A2BE2' : '#666'} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, splitMethod === 'unequal' && styles.activeTab]} 
          onPress={() => onSplitMethodChange('unequal')}
        >
          <Text style={[
            styles.tabText, 
            splitMethod === 'unequal' && styles.activeTabText
          ]}>
            123
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, splitMethod === 'shares' && styles.activeTab]} 
          onPress={() => onSplitMethodChange('shares')}
        >
          <Ionicons 
            name="pie-chart" 
            size={22} 
            color={splitMethod === 'shares' ? '#8A2BE2' : '#666'} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, splitMethod === 'percentage' && styles.activeTab]} 
          onPress={() => onSplitMethodChange('percentage')}
        >
          <Text style={[
            styles.tabText, 
            splitMethod === 'percentage' && styles.activeTabText
          ]}>
            %
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Split method title and info */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Ionicons 
            name={
              splitMethod === 'equal' ? 'people' : 
              splitMethod === 'shares' ? 'pie-chart' :
              splitMethod === 'percentage' ? 'document-text' : 'calculator'
            } 
            size={20} 
            color="#8A2BE2" 
          />
          <Text style={styles.titleText}>
            {splitMethod === 'equal' ? 'Split evenly' : 
             splitMethod === 'unequal' ? 'Split by amounts' :
             splitMethod === 'percentage' ? 'Split by percentages' : 
             'Split by shares'}
          </Text>
        </View>
        
        <Text style={[
          styles.splitInfoText,
          recalculating && styles.recalculatingText
        ]}>
          {calculateSplitInfo()}
        </Text>
      </View>
      
      {/* Members list */}
      <FlatList
        data={members}
        keyExtractor={item => item.uid}
        style={styles.membersList}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => onToggleMember(item.uid)}
            >
              <View style={[
                styles.checkboxInner,
                selectedMembers[item.uid] && styles.checkboxChecked
              ]}>
                {selectedMembers[item.uid] && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.nameText} numberOfLines={1}>
              {item.name}
            </Text>
            
            {renderSplitValue(item)}
          </View>
        )}
      />
      
      {/* Action button */}
      <TouchableOpacity 
        style={styles.applyButton}
        onPress={onApplySplit}
      >
        <Text style={styles.applyButtonText}>Apply Split</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12
  },
  activeTab: {
    backgroundColor: '#F0E6FF',
    borderBottomWidth: 2,
    borderBottomColor: '#8A2BE2'
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  activeTabText: {
    color: '#8A2BE2',
    fontWeight: 'bold'
  },
  infoContainer: {
    backgroundColor: '#F9F6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333'
  },
  splitInfoText: {
    fontSize: 14,
    color: '#666'
  },
  recalculatingText: {
    color: '#8A2BE2',
    fontWeight: '500'
  },
  membersList: {
    flex: 1,
    marginBottom: 16
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  checkbox: {
    marginRight: 10
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#8A2BE2',
    borderColor: '#8A2BE2'
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8A2BE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  nameText: {
    flex: 1,
    fontSize: 15,
    color: '#333'
  },
  disabledText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic'
  },
  amountText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  input: {
    width: 60,
    fontSize: 15,
    textAlign: 'right',
    color: '#333',
    padding: 2
  },
  inputPrefix: {
    fontSize: 15,
    color: '#666',
    marginRight: 2
  },
  inputSuffix: {
    fontSize: 15,
    color: '#666',
    marginLeft: 2
  },
  sharesContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  shareButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8A2BE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4
  },
  sharesText: {
    fontSize: 15,
    fontWeight: '500',
    width: 24,
    textAlign: 'center'
  },
  applyButton: {
    backgroundColor: '#8A2BE2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default SimpleSplitOptions;