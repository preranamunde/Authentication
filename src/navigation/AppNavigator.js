import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CategoryScreen from '../screens/CategoryScreen';
import PersonalDetailsScreen from '../screens/PersonalDetailsScreen';
import LoginScreen from '../screens/LoginScreen';
import CongratulationsScreen from '../screens/CongratulationsScreen';
import FetchDataScreen from '../screens/FetchDataScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Category"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Category"
          component={CategoryScreen}
          options={{ 
            title: 'Welcome',
            headerShown: false 
          }}
        />
        <Stack.Screen
          name="PersonalDetails"
          component={PersonalDetailsScreen}
          options={{ title: 'Register - Personal Details' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ 
            title: 'Login',
            headerShown: false 
          }}
        />
        <Stack.Screen
          name="Congratulations"
          component={CongratulationsScreen}
          options={{ 
            title: 'Success',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="FetchData"
          component={FetchDataScreen}
          options={{ title: 'All Records' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;