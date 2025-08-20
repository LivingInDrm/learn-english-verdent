import { View, Text, StyleSheet } from 'react-native'
import { Link } from 'expo-router'

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Describe & See</Text>
      <Text style={styles.subtitle}>English Learning App</Text>
      <Link href="/practice" style={styles.link}>
        <Text style={styles.linkText}>Start Practice</Text>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  link: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  linkText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})