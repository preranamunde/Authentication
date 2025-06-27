import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DatabaseService from '../services/DatabaseService';

const PersonalDetailsScreen = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    permanentAddress: '',
    password: '',
  });

  const [addressData, setAddressData] = useState({
    communicationAddress: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (route.params?.editData) {
      const { editData } = route.params;
      setFormData({
        name: editData.name || '',
        email: editData.email || '',
        phone: editData.phone || '',
        age: editData.age?.toString() || '',
        permanentAddress: editData.permanentAddress || '',
        password: editData.password || '',
      });

      setAddressData({
        communicationAddress: editData.communicationAddress || '',
      });

      setIsEditing(true);
      setEditingId(editData.id);
    }
  }, [route.params]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (field, value) => {
    setAddressData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };

  const validateForm = () => {
    const { name, email, phone, age, permanentAddress, password } = formData;
    const { communicationAddress } = addressData;

    console.log('🔍 Validating form data:', {
      name: name?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      age: age?.trim(),
      permanentAddress: permanentAddress?.trim(),
      password: !!password?.trim(),
      communicationAddress: communicationAddress?.trim(),
    });

    // Check if any field is empty (all fields are required)
    if (!name?.trim()) {
      Alert.alert('Validation Error', 'Name is required and cannot be empty');
      return false;
    }

    if (!email?.trim()) {
      Alert.alert('Validation Error', 'Email is required and cannot be empty');
      return false;
    }

    if (!phone?.trim()) {
      Alert.alert('Validation Error', 'Phone number is required and cannot be empty');
      return false;
    }

    if (!age?.trim()) {
      Alert.alert('Validation Error', 'Age is required and cannot be empty');
      return false;
    }

    if (!permanentAddress?.trim()) {
      Alert.alert('Validation Error', 'Permanent Address is required and cannot be empty');
      return false;
    }

    if (!communicationAddress?.trim()) {
      Alert.alert('Validation Error', 'Communication Address is required and cannot be empty');
      return false;
    }

    if (!password?.trim()) {
      Alert.alert('Validation Error', 'Password is required and cannot be empty');
      return false;
    }

    // Email validation with more strict pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address (e.g., example@domain.com)');
      return false;
    }

    // Phone validation - exactly 10 digits, no other characters
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits');
      return false;
    }

    // Update phone in formData to clean version
    setFormData(prev => ({ ...prev, phone: cleanPhone }));

    // Age validation - must be a number between 1 and 150
    const ageNum = parseInt(age.trim());
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      Alert.alert('Validation Error', 'Please enter a valid age between 1 and 150');
      return false;
    }

    // Password validation - must contain alphabets, numbers, and symbols
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    if (!passwordRegex.test(password.trim())) {
      Alert.alert(
        'Validation Error', 
        'Password must contain:\n• At least one letter (a-z or A-Z)\n• At least one number (0-9)\n• At least one special character (!@#$%^&* etc.)'
      );
      return false;
    }

    if (password.trim().length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }

    // Check for minimum length requirements
    if (name.trim().length < 2) {
      Alert.alert('Validation Error', 'Name must be at least 2 characters long');
      return false;
    }

    if (permanentAddress.trim().length < 10) {
      Alert.alert('Validation Error', 'Permanent address must be at least 10 characters long');
      return false;
    }

    if (communicationAddress.trim().length < 10) {
      Alert.alert('Validation Error', 'Communication address must be at least 10 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    if (isSubmitting) {
      console.log('⏳ Already submitting, ignoring duplicate request');
      return;
    }

    setIsSubmitting(true);

    try {
      await DatabaseService.testConnection();
      console.log('✅ Database connection verified');

      const detailsData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(), // Normalize email
        phone: formData.phone.trim().replace(/\D/g, ''), // Clean phone number
        age: parseInt(formData.age.trim()),
        permanentAddress: formData.permanentAddress.trim(),
        password: formData.password.trim(),
      };

      const cleanAddressData = {
        communicationAddress: addressData.communicationAddress.trim(),
      };

      console.log('📤 Submitting Data:', {
        ...detailsData,
        password: '***', // Don't log actual password
      }, cleanAddressData);

      if (isEditing) {
        await DatabaseService.updatePersonalDetailWithAddresses(editingId, detailsData, cleanAddressData);
        console.log('✅ Update successful');
        Alert.alert('Success', 'Details updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        const insertId = await DatabaseService.insertPersonalDetailWithAddresses(detailsData, cleanAddressData);
        console.log('✅ Insert successful, ID:', insertId);

        Alert.alert('Success', 'Registration successful!', [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Category' }],
              });
            },
          },
        ]);
      }
    } catch (error) {
      console.log('❌ Error saving data:', error);
      Alert.alert('Save Error', error.message || 'Failed to save details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      age: '',
      permanentAddress: '',
      password: '',
    });
    setAddressData({
      communicationAddress: '',
    });
    setIsEditing(false);
    setEditingId(null);
    setShowPassword(false);
  };

  // Test database connection on component mount
  useEffect(() => {
    const testDb = async () => {
      try {
        await DatabaseService.testConnection();
        console.log('✅ Database ready');
      } catch (error) {
        console.log('❌ Database not ready:', error);
        Alert.alert('Database Error', 'Failed to connect to database. Please restart the app.');
      }
    };
    
    testDb();
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>
          {isEditing ? 'Edit Personal Details' : 'Add Personal Details'}
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter your full name (min 2 characters)"
              placeholderTextColor="#999"
              maxLength={50}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter valid email (example@domain.com)"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) =>
                handleInputChange('phone', value.replace(/[^0-9]/g, '').slice(0, 10))
              }
              placeholder="Enter exactly 10 digit phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Text style={styles.helperText}>
              Phone number must be exactly 10 digits (numbers only)
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(value) => handleInputChange('age', value.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="Enter age (1-150)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.helperText}>
              Age must be between 1 and 150 years
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Enter secure password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="done"
                maxLength={50}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={togglePasswordVisibility}
                activeOpacity={0.7}
              >
                <Text style={[styles.eyeButtonText, { color: showPassword ? '#dc3545' : '#007bff' }]}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              Password must contain: letters, numbers, special characters (min 6 chars)
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Permanent Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.permanentAddress}
              onChangeText={(value) => handleInputChange('permanentAddress', value)}
              placeholder="Enter your permanent address (min 10 characters)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Additional Address Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Communication Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={addressData.communicationAddress}
                onChangeText={(value) =>
                  handleAddressChange('communicationAddress', value)
                }
                placeholder="Enter your communication address (min 10 characters)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>
          </View>

          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>* All fields are required and must meet validation criteria</Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Saving...') 
                : (isEditing ? 'Update Details' : 'Save Details')
              }
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.viewDataButton}
            onPress={() => navigation.navigate('FetchData')}
            disabled={isSubmitting}
          >
            <Text style={styles.viewDataButtonText}>View All Records</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
    paddingLeft: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  eyeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  addressSection: {
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 5,
  },
  noteContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  viewDataButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  viewDataButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PersonalDetailsScreen;