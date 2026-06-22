export const config = {
  matcher: '/((?!_next|favicon.ico).*)',
};

export default function middleware(request) {
  const auth = request.headers.get('authorization');

  const validUser = 'merkle';
  const validPass = 'demo2025';
  const expected = 'Basic ' + btoa(`${validUser}:${validPass}`);

  if (auth !== expected) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="MerkleShop Demo"',
      },
    });
  }
}
