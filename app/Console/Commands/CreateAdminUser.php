<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\WalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create {--email= : Email address for the admin user} {--name= : Name of the admin user} {--phone= : Phone number (optional)} {--password= : Password (will be prompted if not provided)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new admin user with secure UUID';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->option('email');
        $name = $this->option('name');
        $phone = $this->option('phone');
        $password = $this->option('password');

        // Prompt for required fields if not provided
        if (! $email) {
            $email = $this->ask('Enter email address (required for admin login)');
        }

        // Validate email format
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address format!');

            return Command::FAILURE;
        }

        if (! $name) {
            $name = $this->ask('Enter admin name');
        }

        if (! $phone) {
            $phone = $this->ask('Enter phone number (optional)', null);
        }

        if (! $password) {
            $password = $this->secret('Enter password (min 8 characters)');
            $confirmPassword = $this->secret('Confirm password');

            if ($password !== $confirmPassword) {
                $this->error('Passwords do not match!');

                return Command::FAILURE;
            }

            if (strlen($password) < 8) {
                $this->error('Password must be at least 8 characters!');

                return Command::FAILURE;
            }
        }

        // Validate phone number format if provided
        if ($phone) {
            $phone = preg_replace('/\D/', '', $phone);
            if (strlen($phone) < 10) {
                $this->error('Invalid phone number format!');

                return Command::FAILURE;
            }
        }

        // Check if user already exists by email
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            if ($this->confirm("User with email {$email} already exists. Update to admin?", true)) {
                $existingUser->update([
                    'role' => 'admin',
                    'name' => $name,
                ]);

                if ($phone) {
                    $existingUser->update(['phone' => $phone]);
                }

                if ($password) {
                    $existingUser->update(['password' => Hash::make($password)]);
                }

                $this->info('✓ User updated to admin successfully!');
                $this->line("  User ID: {$existingUser->id}");
                $this->line("  Email: {$existingUser->email}");
                $this->line("  Role: {$existingUser->role}");

                return Command::SUCCESS;
            }

            return Command::FAILURE;
        }

        // Check if phone is already taken (if provided)
        if ($phone && User::where('phone', $phone)->exists()) {
            $this->error("Phone number {$phone} is already taken!");

            return Command::FAILURE;
        }

        // Create admin user
        $userData = [
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'admin',
            'email_verified_at' => now(),
        ];

        if ($phone) {
            $userData['phone'] = $phone;
        }

        $user = User::create($userData);

        // Create wallet for admin
        $walletService = app(WalletService::class);
        $walletService->getWallet($user);

        $this->info('✓ Admin user created successfully!');
        $this->line("  User ID (UUID): {$user->id}");
        $this->line("  Name: {$user->name}");
        $this->line("  Email: {$user->email}");
        $this->line('  Phone: '.($user->phone ?? 'N/A'));
        $this->line("  Role: {$user->role}");
        $this->newLine();
        $this->warn('⚠️  Keep these credentials secure!');
        $this->warn('⚠️  Enable two-factor authentication for additional security!');

        return Command::SUCCESS;
    }
}
