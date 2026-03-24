const getAuthToken = () => localStorage.getItem('hia_token');

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMsg = 'API request failed';
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
    } catch (e) {
      errorMsg = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }
  return response.json();
};

export const api = {
  get: async (url: string) => {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return handleResponse(response);
  },
  post: async (url: string, data: any) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  delete: async (url: string) => {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    return handleResponse(response);
  },
};
