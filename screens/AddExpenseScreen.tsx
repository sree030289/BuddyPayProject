import React, { useState } from 'react';
import { 
  Camera, Receipt, FileText, Tag, Users, 
  UserPlus, Percent, Calendar, X, ChevronLeft,
  DollarSign, FileUp, CreditCard, Hash, 
  Search, Check, Scan
} from 'lucide-react';

export default function AddExpenseScreen() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaidByModal, setShowPaidByModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');
  
  // Mock data for the UI
  const categories = [
    { id: 'food', name: 'Food & Drinks', icon: 'utensils' },
    { id: 'transport', name: 'Transport', icon: 'car' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping-bag' },
    { id: 'entertainment', name: 'Entertainment', icon: 'film' },
    { id: 'home', name: 'House', icon: 'home' },
    { id: 'bills', name: 'Bills', icon: 'file-text' },
    { id: 'health', name: 'Health', icon: 'heart' },
    { id: 'travel', name: 'Travel', icon: 'plane' }
  ];
  
  const members = [
    { id: '1', name: 'You', isSelected: true },
    { id: '2', name: 'Alex Smith', isSelected: true },
    { id: '3', name: 'Jamie Johnson', isSelected: false },
    { id: '4', name: 'Taylor Brown', isSelected: true },
    { id: '5', name: 'Jordan Wilson', isSelected: false }
  ];
  
  const splitOptions = [
    { id: 'equal', name: 'Split equally', description: 'Everyone pays the same amount' },
    { id: 'percentage', name: 'Split by percentage', description: 'Split by custom percentages' },
    { id: 'unequal', name: 'Split by amounts', description: 'Specify exact amounts for each person' },
    { id: 'shares', name: 'Split by shares', description: 'Use shares to determine split ratio' }
  ];
  
  const toggleMemberSelection = (memberId) => {
    // In a real app, this would update the members array
    console.log('Toggle member:', memberId);
  };
  
  const handleCategorySelect = (categoryId) => {
    setCategory(categoryId);
    setShowCategoryModal(false);
  };
  
  const handleSplitMethodSelect = (method) => {
    setSplitMethod(method);
    setShowSplitModal(false);
  };
  
  const getCategoryName = () => {
    const selectedCategory = categories.find(c => c.id === category);
    return selectedCategory ? selectedCategory.name : 'Category';
  };
  
  const getSelectedMembersText = () => {
    const selectedCount = members.filter(m => m.isSelected).length;
    if (selectedCount === members.length) return 'Everyone';
    if (selectedCount === 0) return 'Select people';
    return `${selectedCount} people`;
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <ChevronLeft className="w-6 h-6 mr-2 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-800">Add Expense</h1>
        </div>
        <X className="w-6 h-6 text-gray-700" />
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-4 flex flex-col overflow-auto">
        {/* Central fields */}
        <div className="mb-8 mt-4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this expense for?"
                className="w-full text-lg outline-none"
              />
            </div>
            <div className="flex items-center">
              <DollarSign className="text-gray-500 w-6 h-6 mr-2" />
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-2xl font-bold outline-none w-full"
              />
            </div>
          </div>
        </div>
        
        {/* Icon grid for other features */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <Scan className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Scan</span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <FileUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Upload</span>
          </div>
          
          <div className="flex flex-col items-center" onClick={() => setShowCategoryModal(true)}>
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <Tag className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">{getCategoryName()}</span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Date</span>
          </div>
          
          <div className="flex flex-col items-center" onClick={() => setShowPaidByModal(true)}>
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Paid by</span>
          </div>
          
          <div className="flex flex-col items-center" onClick={() => setShowMembersModal(true)}>
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">{getSelectedMembersText()}</span>
          </div>
          
          <div className="flex flex-col items-center" onClick={() => setShowSplitModal(true)}>
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <Percent className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">
              {splitMethod === 'equal' ? 'Equal split' : 'Custom split'}
            </span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mb-1">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">Notes</span>
          </div>
        </div>
        
        {/* Optional: Group info card */}
        <div className="bg-blue-50 rounded-lg p-3 flex items-center">
          <Users className="w-5 h-5 text-blue-600 mr-2" />
          <span className="text-sm text-blue-600">Expense for group: Trip to Vegas</span>
        </div>
      </div>
      
      {/* Bottom save button */}
      <div className="bg-white p-4 border-t border-gray-200">
        <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium">
          Save Expense
        </button>
      </div>
      
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-t-xl w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Select Category</h3>
              <X className="w-5 h-5 text-gray-500" onClick={() => setShowCategoryModal(false)} />
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex flex-col items-center p-3 rounded-lg ${category === cat.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleCategorySelect(cat.id)}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${category === cat.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Tag className={`w-6 h-6 ${category === cat.id ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <span className={`text-sm mt-2 ${category === cat.id ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Paid By Modal */}
      {showPaidByModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-t-xl w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Who paid?</h3>
              <X className="w-5 h-5 text-gray-500" onClick={() => setShowPaidByModal(false)} />
            </div>
            
            <div className="p-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center p-3 rounded-lg mb-2 border border-gray-100 hover:bg-gray-50"
                  onClick={() => setShowPaidByModal(false)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
                    {member.name.charAt(0)}
                  </div>
                  <span className="flex-1 font-medium text-gray-800">{member.name}</span>
                  {member.id === '1' && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Split Options Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-t-xl w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Split Options</h3>
              <X className="w-5 h-5 text-gray-500" onClick={() => setShowSplitModal(false)} />
            </div>
            
            <div className="p-4 space-y-3">
              {splitOptions.map((option) => (
                <div
                  key={option.id}
                  className={`p-4 rounded-lg flex items-center justify-between border ${splitMethod === option.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                  onClick={() => handleSplitMethodSelect(option.id)}
                >
                  <div>
                    <h4 className={`font-medium ${splitMethod === option.id ? 'text-blue-600' : 'text-gray-800'}`}>
                      {option.name}
                    </h4>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                  {splitMethod === option.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-t-xl w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Split with</h3>
              <X className="w-5 h-5 text-gray-500" onClick={() => setShowMembersModal(false)} />
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search friends or group members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center p-3 rounded-lg mb-2 border border-gray-100 hover:bg-gray-50"
                  onClick={() => toggleMemberSelection(member.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
                    {member.name.charAt(0)}
                  </div>
                  <span className="flex-1 font-medium text-gray-800">{member.name}</span>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${member.isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {member.isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              ))}
              
              <button 
                className="w-full bg-blue-600 text-white p-3 rounded-lg mt-4 font-medium"
                onClick={() => setShowMembersModal(false)}
              >
                Confirm ({members.filter(m => m.isSelected).length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}